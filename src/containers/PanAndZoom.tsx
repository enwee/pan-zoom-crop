import { Button } from 'flowbite-react';
import React, { useRef, useEffect, useState, MouseEventHandler, ChangeEventHandler } from 'react';

const cW = 400; // Canvas width
const cH = 400; // Canvas height
const cropW = 100;
const cropFactor = cropW / cW;

export const PanAndZoom = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const croppedRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(new Image());
  const image = imageRef.current;

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState({ w: 1, h: 1 });

  const dragRef = useRef({ isDragging: false, startX: 0, startY: 0 });
  const drag = dragRef.current;

  const [croppedImage, setCroppedImage] = useState<Blob | null>(null);

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    const x = (pan.x * zoom) - ((zoom - 1) * scale.w * cW / 2);
    const y = (pan.y * zoom) - ((zoom - 1) * scale.h * cH / 2);
    drawImage(x, y);
    cropImage(x, y);
  }, [zoom, pan, origin, scale]);

  const init = async () => {
    // Initial image
    changeImage(null as unknown as React.ChangeEvent<HTMLInputElement>);

    // Setup canvas
    canvasRef.current!.width = cW;
    canvasRef.current!.height = cH;
    drawImage(pan.x, pan.y);

    // Setup cropped
    croppedRef.current!.width = cW * cropFactor;
    croppedRef.current!.height = cH * cropFactor;
    const ctx = croppedRef.current!.getContext('2d')!;
    ctx.scale(cropFactor, cropFactor);
    ctx.arc(cW / 2, cH / 2, cW / 2, 0, 2 * Math.PI);
    ctx.clip();
    cropImage(pan.x, pan.y);
  };

  const drawImage = (x: number, y: number) => { // Here x, y is the offset from canvas origin
    const ctx = canvasRef.current!.getContext('2d')!;
    ctx.clearRect(0, 0, cW, cH);
    ctx.drawImage(image, origin.x + x, origin.y + y, scale.w * cW * zoom, scale.h * cH * zoom);
    ctx.arc(cW / 2, cH / 2, cW / 2, 0, 2 * Math.PI);
    ctx.stroke();
  };

  const cropImage = (x: number, y: number) => {
    const ctx = croppedRef.current!.getContext('2d')!;
    ctx.clearRect(0, 0, cW, cH);
    ctx.drawImage(image, origin.x + x, origin.y + y, scale.w * cW * zoom, scale.h * cH * zoom);
    croppedRef.current!.toBlob(setCroppedImage);
  };

  const saveImage = () => {
    const anchor = document.createElement('a');
    anchor.download = 'thumbnail.png';
    anchor.href = URL.createObjectURL(croppedImage!);
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  };

  const resetCanvas = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const changeImage: ChangeEventHandler<HTMLInputElement> = async e => {
    image.src = e ? URL.createObjectURL(e.target.files![0]) : '/vite.svg';
    // Img.crossOrigin = 'Anonymous'; // Is this needed?
    await image.decode(); // .catch(alert); <- the source image cannot be decoded.

    const longerSide = Math.max(image.naturalWidth, image.naturalHeight);
    const scaledW = image.naturalWidth / longerSide;
    const scaledH = image.naturalHeight / longerSide;
    const originX = scaledW < scaledH ? (1 - scaledW) * cW / 2 : 0;
    const originY = scaledH < scaledW ? (1 - scaledH) * cH / 2 : 0;
    setOrigin({ x: originX, y: originY });
    setScale({ w: scaledW, h: scaledH });

    resetCanvas();
  };

  const onmousedown: MouseEventHandler<HTMLCanvasElement> = e => {
    drag.isDragging = true;
    drag.startX = e.clientX;
    drag.startY = e.clientY;
  };

  const onmousemove: MouseEventHandler<HTMLCanvasElement> = e => {
    if (drag.isDragging) {
      const x = pan.x + (e.clientX - drag.startX);
      const y = pan.y + (e.clientY - drag.startY);
      setPan({ x, y });
      drag.startX = e.clientX;
      drag.startY = e.clientY;
    }
  };

  const onmouseleave: MouseEventHandler<HTMLCanvasElement> = () => {
    drag.isDragging = false;
  };

  const onmouseup: MouseEventHandler<HTMLCanvasElement> = () => {
    drag.isDragging = false;
  };

  return (
    <>
      <div className="flex space-x-4">
        <div className="rounded-xl bg-white h-128 w-128 text-center p-4">
          <canvas className="border-solid border cursor-move"
            ref={canvasRef}
            onMouseDown={onmousedown}
            onMouseMove={onmousemove}
            onMouseLeave={onmouseleave}
            onMouseUp={onmouseup}
          />
          <div className="flex justify-center space-x-4">
            {/* <NumberInput controls={false} label="zoom" value={zoom} onChange={num => setZoom(num)} />
            <NumberInput controls={false} label="pan x" value={pan.x} onChange={num => setPan({ x: num })} />
            <NumberInput controls={false} label="pan y" value={pan.y} onChange={num => setPan({ y: num })} /> */}
          </div>
        </div>
        <div className="rounded-xl bg-white w-60 p-4 space-y-8">
          <input type="file" id="image" accept="image/png, image/jpeg, image/webp, image/gif" onChange={changeImage} />
          <div className="space-y-4">
            <input type='range' min={0} max={5} step={0.01} value={zoom} onChange={e => setZoom(Number(e.target.value))} />
            <Button onClick={resetCanvas}>Reset</Button>
          </div>
          <div className="space-y-4">
            <canvas className="bg-neutral-30" ref={croppedRef} />
            <div>{croppedImage?.size} bytes</div>
            <div>{croppedImage?.type}</div>
            <Button onClick={saveImage}>Save</Button>
          </div>
        </div>
      </div>
    </>
  );
};

