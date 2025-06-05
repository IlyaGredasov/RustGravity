import React from 'react';
import { Graphics } from '@pixi/react';

function SpaceObject({ pos} ) {
  return (
    <Graphics
      draw={(g) => {
        g.clear();
        g.lineStyle(0);
        g.beginFill(0xffffff);
        g.drawCircle(pos.x, pos.y, pos.radius);
        g.endFill();
      }}
    />
  );
}

export default SpaceObject;