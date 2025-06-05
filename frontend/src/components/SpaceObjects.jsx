import SpaceObject from './SpaceObject';


function SpaceObjects({ positions}) {

  return (
      positions.map((pos, index) => (
        <SpaceObject key={index} pos={pos}/>
      ))
  );
}

export default SpaceObjects;

