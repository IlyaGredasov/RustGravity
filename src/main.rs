mod space_computation;
use std::{
    collections::HashMap,
    net::SocketAddr,
    sync::{
        atomic::{AtomicBool, Ordering}, Arc,
        Mutex,
    },
    thread::{self, JoinHandle},
    time::{Duration, Instant},
};

use axum::{
    extract::{
        ws::{Message, Utf8Bytes, WebSocket, WebSocketUpgrade},
        State,
    }, http::{Request, Response, StatusCode},
    response::IntoResponse,
    routing::{get, post},
    serve,
    Json,
    Router,
};
use futures::StreamExt;
use nalgebra::Vector2;
use serde::Deserialize;
use serde_json::{json, Value};
use space_computation::{CollisionType, MovementType, Simulation, SpaceObject};
use tokio::{net::TcpListener, sync::broadcast};
use tower_http::{cors::CorsLayer, trace::TraceLayer};
use tracing::{info, info_span, Span};
use uuid::Uuid;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();
    let (tx, _) = broadcast::channel(32);
    let app = Router::new()
        .route("/launch_simulation", post(launch_simulation))
        .route("/delete_simulation", post(delete_simulation))
        .route("/ws", get(ws_handler))
        .with_state(AppState {
            pools: Arc::new(Mutex::new(HashMap::new())),
            tx
        })
        .layer(
            TraceLayer::new_for_http()
                .make_span_with(|req: &Request<_>| {
                    info_span!("request", method = %req.method(), path = %req.uri().path())
                })
                .on_request(|_req: &Request<_>, _span: &Span| {
                    info!("--> request started");
                })
                .on_response(|_res: &Response<_>, _latency: Duration, _span: &Span| {
                    info!("<-- response sent");
                })
        )
        .layer(CorsLayer::permissive());

    let addr: SocketAddr = "0.0.0.0:5000".parse().unwrap();
    println!("Listening on http://{}", addr);

    let listener = TcpListener::bind(addr).await.unwrap();
    serve(listener, app).await.unwrap();
}

type UserId = String;
pub struct SimulationExecutionPool {
    pub simulation: Arc<Mutex<Simulation>>,
    pub thread: JoinHandle<()>,
    pub stop_flag: Arc<AtomicBool>,
}

#[derive(Clone)]
pub struct AppState {
    pub pools: Arc<Mutex<HashMap<UserId, SimulationExecutionPool>>>,
    pub tx: broadcast::Sender<(UserId, String)>,
}

fn stop_execution_pool(state: &AppState, user_id: &str) {
    let mut map = state.pools.lock().unwrap();
    if let Some(pool) = map.remove(user_id) {
        pool.stop_flag.store(true, Ordering::Relaxed);
        let _ = pool.thread.join();
    }
}

#[derive(Deserialize)]
struct ButtonPress {
    direction: String,
    is_pressed: bool,
}

fn handle_button_press(state: &AppState, user_id: &str, press: ButtonPress) {
    if let Some(pool) = state.pools.lock().unwrap().get_mut(user_id) {
        if let Some(acc) = pool
            .simulation
            .lock()
            .unwrap()
            .controllable_acceleration
            .as_mut()
        {
            match press.direction.as_str() {
                "up" => acc.up = press.is_pressed,
                "down" => acc.down = press.is_pressed,
                "left" => acc.left = press.is_pressed,
                "right" => acc.right = press.is_pressed,
                _ => {}
            }
        }
    }
}

async fn handle_socket(mut socket: WebSocket, state: AppState) {
    let user_id = Uuid::new_v4().to_string();
    let _ = socket
        .send(Message::Text(Utf8Bytes::from(
            json!({ "user_id": &user_id }).to_string(),
        )))
        .await;
    let mut rx = state.tx.subscribe();
    loop {
        tokio::select! {
            Ok((uid, payload)) = rx.recv() => {
                if uid == user_id {
                    let _ = socket.send(Message::Text(Utf8Bytes::from(payload))).await;
                }
            },
            Some(Ok(msg)) = socket.next() => {
                if let Message::Text(txt) = msg {
                    if let Ok(val) = serde_json::from_str::<Value>(&txt) {
                        if val.get("event") == Some(&Value::String("button_press".into())) {
                            if let Ok(press) = serde_json::from_value::<ButtonPress>(val["data"].clone()) {
                                handle_button_press(&state, &user_id, press);
                            }
                        }
                    }
                }
            },
            else => break,
        }
    }
    stop_execution_pool(&state, &user_id);
}

async fn ws_handler(ws: WebSocketUpgrade, State(state): State<AppState>) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn launch_simulation(
    State(state): State<AppState>,
    Json(data): Json<Value>,
) -> impl IntoResponse {
    let user_id = data["user_id"].as_str().unwrap_or_default().to_owned();
    stop_execution_pool(&state, &user_id);
    let s = Simulation::default();
    let time_delta = data["time_delta"].as_f64().unwrap_or(s.time_delta);
    let sim_time = data["simulation_time"]
        .as_f64()
        .unwrap_or(s.simulation_time);
    let g = data["G"].as_f64().unwrap_or(s.g);
    let accel_rate = data["acceleration_rate"]
        .as_f64()
        .unwrap_or(s.acceleration_rate);
    let elasticity = data["elasticity_coefficient"]
        .as_f64()
        .unwrap_or(s.elasticity_coefficient);
    let collision = data["collision_type"]
        .as_i64()
        .and_then(|v| CollisionType::try_from(v).ok())
        .unwrap_or(s.collision_type);

    let objs = data["space_objects"]
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .map(|o| {
            let pos = Vector2::new(
                o["position"]["x"].as_f64().unwrap_or(0.0),
                o["position"]["y"].as_f64().unwrap_or(0.0),
            );
            let vel = Vector2::new(
                o["velocity"]["x"].as_f64().unwrap_or(0.0),
                o["velocity"]["y"].as_f64().unwrap_or(0.0),
            );
            let mv = MovementType::try_from(o["movement_type"].as_i64().unwrap_or(0))
                .unwrap_or(MovementType::Static);

            SpaceObject {
                name: o["name"].as_str().unwrap_or("Unnamed").into(),
                mass: o["mass"].as_f64().unwrap_or(1.0),
                radius: o["radius"].as_f64().unwrap_or(1.0),
                position: pos,
                velocity: vel,
                acceleration: Vector2::new(0.0, 0.0),
                movement_type: mv,
            }
        })
        .collect::<Vec<_>>();

    let simulation = match Simulation::new(
        objs, time_delta, sim_time, g, collision, accel_rate, elasticity,
    ) {
        Ok(s) => Arc::new(Mutex::new(s)),
        Err(msg) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({ "status": "error", "message": msg })),
            );
        }
    };

    let stop_flag = Arc::new(AtomicBool::new(false));
    let flag_clone = Arc::clone(&stop_flag);
    let sim_clone = Arc::clone(&simulation);
    let uid_clone = user_id.clone();
    let tx_clone = state.tx.clone();

    let thread = thread::spawn(move || {
        simulate_loop(uid_clone, sim_clone, flag_clone, tx_clone);
    });

    let pool = SimulationExecutionPool {
        simulation,
        stop_flag,
        thread,
    };

    state.pools.lock().unwrap().insert(user_id, pool);
    (StatusCode::OK, Json(json!({ "status": "success" })))
}

async fn delete_simulation(
    State(state): State<AppState>,
    Json(data): Json<Value>,
) -> impl IntoResponse {
    let user_id = data["user_id"].as_str().unwrap_or_default().to_string();
    stop_execution_pool(&state, &user_id);
    Json(json!({ "status": "success" }))
}

fn simulate_loop(
    user_id: String,
    simulation: Arc<Mutex<Simulation>>,
    stop_flag: Arc<AtomicBool>,
    tx: broadcast::Sender<(String, String)>,
) {
    thread::spawn(move || {
        let target_step_time = 1.0 / 60.0;

        // Один раз берём sim для параметров
        let (steps_per_emit, total_steps) = {
            let sim = simulation.lock().unwrap();
            let steps = (target_step_time / sim.time_delta).max(1.0).floor() as usize;
            let total = (sim.simulation_time / sim.time_delta).floor() as usize;
            (steps, total)
        };

        let mut step_count = 0;

        while !stop_flag.load(Ordering::Relaxed) && step_count < total_steps {
            let start = Instant::now();

            for _ in 0..steps_per_emit {
                if stop_flag.load(Ordering::Relaxed) || step_count >= total_steps {
                    break;
                }

                let mut sim = simulation.lock().unwrap();
                sim.calculate_step();
                step_count += 1;
            }

            let snapshot = {
                let sim = simulation.lock().unwrap();
                let state = sim
                    .space_objects
                    .iter()
                    .enumerate()
                    .map(|(i, obj)| {
                        json!({
                            i.to_string(): {
                                "x": obj.position.x,
                                "y": obj.position.y,
                                "radius": obj.radius,
                            }
                        })
                    })
                    .collect::<Vec<_>>();
                json!(state)
            };

            let payload = json!({
                "event": "update_step",
                "data": snapshot
            });

            let _ = tx.send((user_id.clone(), payload.to_string()));

            if let Some(remaining) =
                Duration::from_secs_f64(target_step_time).checked_sub(start.elapsed())
            {
                thread::sleep(remaining);
            }
        }
    });
}
