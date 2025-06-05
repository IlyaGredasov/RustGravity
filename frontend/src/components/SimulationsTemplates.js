export const simulationTemplates = {
  solarSystemShort: {
    name: "Солнечная система (укороченная)",
    params: {
      space_objects: [
        { name: "Солнце", mass: 1000, radius: 60, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, movement_type: 0 },
        { name: "Земля", mass: 150, radius: 20, position: { x: 600, y: 0 }, velocity: { x: 0, y: 500 }, movement_type: 1 },
        { name: "Луна", mass: 1, radius: 10, position: { x: 700, y: 0 }, velocity: { x: 50, y: 550 }, movement_type: 1 }
      ],
      time_delta: 0.005,
      simulation_time: 100000,
      G: 10,
      collision_type: 1,
      acceleration_rate: 1.0,
      elasticity_coefficient: 50.0,
    }
  },
  solarSystem: {
    name: "Солнечная система (полная)",
    params: {
      space_objects: [
        { name: "Солнце",  mass: 5000, radius: 80,  position: { x: 0, y: 0 },   velocity: { x: 0, y: 0 }, movement_type: 0 },
        { name: "Меркурий",  mass: 18, radius: 12, position: { x: 300, y: 0 },  velocity: { x: 0, y: 590 }, movement_type: 1},
        { name: "Венера",  mass: 45, radius: 18,  position: { x: 450, y: 0 },  velocity: { x: 0, y: 700 }, movement_type: 1 },
        { name: "Земля",  mass: 50, radius: 20,  position: { x: 600, y: 0 },  velocity: { x: 0, y: 800 }, movement_type: 1 },
        { name: "Луна",  mass: 1,  radius: 8, position: { x: 630, y: 0 }, velocity: { x: 100, y: 900 }, movement_type: 1 },
        { name: "Марс",  mass: 30, radius: 16,   position: { x: 800, y: 0 }, velocity: { x: 0, y: 1100 }, movement_type: 1 },
        { name: "Юпитер",  mass: 200, radius: 40, position: { x: 1200, y: 0 }, velocity: { x: 0, y: 1400 }, movement_type: 1 },
        { name: "Сатурн",  mass: 150, radius: 35, position: { x: 1600, y: 0 }, velocity: { x: 0, y: 1600 }, movement_type: 1 },
        { name: "Уран",  mass: 80, radius: 25,   position: { x: 2000, y: 0 }, velocity: { x: 0, y: 1700 }, movement_type: 1 },
        { name: "Нептун",  mass: 90, radius: 24,  position: { x: 2400, y: 0 }, velocity: { x: 0, y: 1800 }, movement_type: 1 }
      ],
      time_delta: 0.005,
      simulation_time: 1000000,
      G: 10,
      collision_type: 1,
      acceleration_rate: 1.0,
      elasticity_coefficient: 50.0,
    }
    },
    binaryStars: {
      name: "Двойные звезды",
      params: {
        space_objects: [
          { name: "Звезда A", mass: 500, radius: 50, position: { x: -200, y: 0 }, velocity: { x: 0, y: 4 }, movement_type: 1 },
          { name: "Звезда B", mass: 500, radius: 50, position: { x: 200, y: 0 }, velocity: { x: 0, y: -4 }, movement_type: 1 }
        ],
        time_delta: 0.05,
        simulation_time: 100000,
        G: 10,
        collision_type: 1,
        acceleration_rate: 1.0,
        elasticity_coefficient: 50.0,
      }
    },
  };

  export default simulationTemplates;