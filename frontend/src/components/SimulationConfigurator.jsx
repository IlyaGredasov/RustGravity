import React, { useState } from "react";
import "./SimulationConfigurator.css";
import { simulationTemplates } from "./SimulationsTemplates";

const SimulationConfigurator = ({ socketId, setPosition }) => {
  const [simulationParams, setSimulationParams] = useState({
    user_id: socketId,
    space_objects: [
      { name: "", mass: 0, radius: 0, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, movement_type: 1 },
      { name: "", mass: 0, radius: 0, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, movement_type: 1 },
    ],
    time_delta: 0.5,
    simulation_time: 100000000,
    G: 10,
    collision_type: 1,
    acceleration_rate: 1.0,
    elasticity_coefficient: 1.0,
  });

  const [selectedTemplate, setSelectedTemplate] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSimulationParams((prev) => ({
      ...prev,
      [name]: isNaN(Number(value)) ? value : parseFloat(value),
    }));
  };

  const handleSpaceObjectChange = (index, field, value) => {
    setSimulationParams((prev) => {
      const updatedObjects = [...prev.space_objects];
      updatedObjects[index][field] = isNaN(Number(value)) ? value : parseFloat(value);
      return { ...prev, space_objects: updatedObjects };
    });
  };

  const addSpaceObject = () => {
    setSimulationParams((prev) => ({
      ...prev,
      space_objects: [
        ...prev.space_objects,
        { name: "", mass: 1, radius: 1, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, movement_type: 0 },
      ],
    }));
  };

  const deleteSpaceObject = (index) => {
    setSimulationParams((prev) => {
      const updatedObjects = prev.space_objects.filter((_, i) => i !== index);
      return { ...prev, space_objects: updatedObjects };
    });
  };

  const handleTemplateChange = (e) => {
    const templateKey = e.target.value;
    setSelectedTemplate(templateKey);
    
    if (templateKey && simulationTemplates[templateKey]) {
      setSimulationParams({
        ...simulationTemplates[templateKey].params,
        user_id: socketId
      });
    }
  };

  const handleLaunchSimulation = async (e) => {
    e.preventDefault();
    simulationParams.elasticity_coefficient /= 100;
    simulationParams.user_id = socketId;
    console.log(simulationParams);
    setPosition({ x: 0, y: 0 });
    try {
      const response = await fetch('http://localhost:5000/launch_simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(simulationParams)
      });
      if (!response.ok) { throw new Error("Not ok") }
      const result = await response.json();
      console.log("Success", result);
    } catch (error) { console.error(error) }
  };

  const handleDeleteSimulation = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/delete_simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ "user_id": socketId })
      });
      if (!response.ok) { throw new Error("Not ok") }
      const result = await response.json();
      console.log("Success", result);
    } catch (error) { console.error(error) }
  };

  return (
    <form onSubmit={handleLaunchSimulation} className="simulator-config">
      <h2 className="config-title">Simulation Configurator</h2>
      <div className="form-section">
        <label>
           Скорость:
          <input type="number" step={0.01} name="time_delta" value={simulationParams.time_delta} onChange={handleChange} />
        </label>
        <label>
           Длительность:
          <input type="number" name="simulation_time" value={simulationParams.simulation_time} onChange={handleChange} />
        </label>
        <label>
           G:
          <input type="number" step={0.1} name="G" value={simulationParams.G} onChange={handleChange} />
        </label>
        <label>
           Тип колизии:
          <select name="collision_type" value={simulationParams.collision_type} onChange={handleChange}>
            <option value={0}>Проходящая</option>
            <option value={1}>Упругая</option>
          </select>
        </label>
        <label>
          Темп ускорения:
          <input type="range" name="acceleration_rate" value={simulationParams.acceleration_rate} onChange={handleChange} />
        </label>
        <label>
          Эластичность:
          <input type="range" name="elasticity_coefficient" value={simulationParams.elasticity_coefficient} onChange={handleChange} />
        </label>
        <label>
          Шаблон:
          <select 
            value={selectedTemplate} 
            onChange={handleTemplateChange}
            className="template-select"
          >
            <option value="">Выберите шаблон...</option>
            {Object.entries(simulationTemplates).map(([key, template]) => (
              <option key={key} value={key}>{template.name}</option>
            ))}
          </select>
        </label>
        <div className="space-objects-container">
          <h3>Объекты</h3>
          {simulationParams.space_objects.map((obj, index) => (
            <div key={index} className="space-object">
              {Object.entries({ "name": "Имя", "mass": "Масса", "radius": "Радиус" }).map(([key, label]) => (
                <div key={key} className="floating-label">
                  <input
                    type={key === "name" ? "text" : "number"}
                    value={obj[key]}
                    onChange={(e) => handleSpaceObjectChange(index, key, e.target.value)}
                    placeholder=" "
                  />
                  <label>{label}</label>
                </div>
              ))}
              {["x", "y"].map((axis) => (
                <div key={`pos-${axis}`} className="floating-label">
                  <input
                    type="number"
                    value={obj.position[axis]}
                    onChange={(e) => handleSpaceObjectChange(index, "position", { ...obj.position, [axis]: e.target.value })}
                    placeholder=" "
                  />
                  <label>Позиция {axis.toUpperCase()}</label>
                </div>
              ))}
              {["x", "y"].map((axis) => (
                <div key={`vel-${axis}`} className="floating-label">
                  <input
                    type="number"
                    value={obj.velocity[axis]}
                    onChange={(e) => handleSpaceObjectChange(index, "velocity", { ...obj.velocity, [axis]: e.target.value })}
                    placeholder=" "
                  />
                  <label>Скорость {axis.toUpperCase()}</label>
                </div>
              ))}
              <div className="floating-label">
                <select
                  value={obj.movement_type}
                  onChange={(e) => handleSpaceObjectChange(index, "movement_type", e.target.value)}
                >
                  <option value={0}>Статический</option>
                  <option value={1}>Стандартный</option>
                  <option value={2}>Управляемый</option>
                </select>
                <label>Тип движения</label>
              </div>
              <button type="button" onClick={() => deleteSpaceObject(index)}>Удалить</button>
            </div>
          ))}
        </div>

        <button type="button" onClick={addSpaceObject}>Добавить</button>
        <button type="button" onClick={handleLaunchSimulation}>Запустить</button>
        <button type="button" onClick={handleDeleteSimulation}>Остановить</button>
      </div>
    </form>
  );
};

export default SimulationConfigurator;