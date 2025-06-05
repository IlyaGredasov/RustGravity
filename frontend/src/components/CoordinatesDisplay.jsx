import React from 'react'

export const CoordinatesDisplay = React.memo(({ position, positions }) => {
  return (
    <div className="coordinates-display">
      <p>Center: ({-position.x}, {-position.y})</p>
      {positions.map((pos, index) => (
        <p key={index}>Object {index + 1}: ({pos.x}, {pos.y})</p>
      ))}
    </div>
  );
});

export default CoordinatesDisplay;