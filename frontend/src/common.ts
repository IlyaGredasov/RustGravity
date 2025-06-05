export const calculateCanvasSize = () => {
  const width = window.innerWidth;
  const height = document.documentElement.clientHeight;
  return { width, height };
}