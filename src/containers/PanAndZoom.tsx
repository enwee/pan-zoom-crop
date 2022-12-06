import { Button, FileInput, Label, TextInput } from 'flowbite-react';
import React, { useRef, useEffect, useState, MouseEventHandler, ChangeEventHandler } from 'react';

const cW = 400; // Canvas width
const cH = 400; // Canvas height
const cropW = 100;
const cropFactor = cropW / cW;
const bgPatternSvg = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="10" height="10" fill="silver"/><rect x="10" y="10" width="10" height="10" fill="silver"/></svg>'

export const PanAndZoom = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const croppedRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(new Image());
  const image = imageRef.current;
  const bgPatternRef = useRef<HTMLImageElement>(new Image())
  const bgPattern = bgPatternRef.current

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState({ w: 1, h: 1 });

  const dragRef = useRef({ isDragging: false, startX: 0, startY: 0 });
  const drag = dragRef.current;

  const [croppedImage, setCroppedImage] = useState<Blob | null>(new Blob());

  useEffect(() => {
    init();
  }, []);

  useEffect(() => { // this works for when zoom changes, double counts when it a pan
    const x = (pan.x * zoom) - ((zoom - 1) * scale.w * cW / 2);
    const y = (pan.y * zoom) - ((zoom - 1) * scale.h * cH / 2);
    drawImage(x, y);
    cropImage(x, y);
  }, [zoom, pan, origin, scale]);

  const init = async () => {
    // Setup bgPattern
    bgPattern.src = bgPatternSvg

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
    ctx.fillStyle = ctx.createPattern(bgPattern, "repeat")!
    ctx.fillRect(0, 0, 400, 400)
    ctx.drawImage(image, origin.x + x, origin.y + y, scale.w * cW * zoom, scale.h * cH * zoom);

    ctx.arc(cW / 2, cH / 2, cW / 2, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.lineWidth = 0.3 // why is this not followed on redraw???
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
    image.src = e ? URL.createObjectURL(e.target.files![0]) : './vite.svg';
    image.crossOrigin = 'Anonymous'; // needed when deployed??
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

  const onMouseDown: MouseEventHandler<HTMLCanvasElement> = e => {
    drag.isDragging = true;
    drag.startX = e.clientX;
    drag.startY = e.clientY;
  };

  const onMouseMove: MouseEventHandler<HTMLCanvasElement> = e => {
    if (drag.isDragging) {
      const x = pan.x + (e.clientX - drag.startX) / zoom;
      const y = pan.y + (e.clientY - drag.startY) / zoom;
      setPan({ x, y });
      drag.startX = e.clientX;
      drag.startY = e.clientY;
    }
  };

  const onMouseUpOrLeave: MouseEventHandler<HTMLCanvasElement> = () => {
    drag.isDragging = false;
  };

  const onTouchStart: React.TouchEventHandler<HTMLCanvasElement> = (e) => {
    e.preventDefault()
    e.stopPropagation()
    drag.startX = e.touches[0].clientX;
    drag.startY = e.touches[0].clientY;
  }

  const onTouchMove: React.TouchEventHandler<HTMLCanvasElement> = (e) => {
    e.preventDefault();
    e.stopPropagation()
    const x = pan.x + (e.touches[0].clientX - drag.startX) / zoom;
    const y = pan.y + (e.touches[0].clientY - drag.startY) / zoom;
    setPan({ x, y });
    drag.startX = e.touches[0].clientX;
    drag.startY = e.touches[0].clientY;
  }

  // const ontouchend = 

  return (
    <>
      <div className="flex space-x-4">
        <div className="rounded-xl bg-white h-128 w-128 text-center p-4 space-y-4">
          <canvas className="cursor-move overscroll-none"
            ref={canvasRef}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseUpOrLeave}
            onMouseUp={onMouseUpOrLeave}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
          // onTouchEnd={ontouchend}
          />
          <div className="flex justify-center items-center space-x-4">
            <Label value="zoom" /><TextInput className='w-16' type="number" value={zoom} onChange={e => setZoom(Number(e.target.value))} />
            <Label value="pan-x" /><TextInput className='w-16' type="number" value={pan.x} onChange={e => setPan(({ y }) => ({ x: Number(e.target.value), y }))} />
            <Label value="pan-y" /><TextInput className='w-16' type="number" value={pan.y} onChange={e => setPan(({ x }) => ({ x, y: Number(e.target.value) }))} />
          </div>
        </div>
        <div className="rounded-xl bg-white w-128 p-4 space-y-8">
          <FileInput

            className=''
            // this doesnt work with mobile
            // accept="image/png, image/jpeg, image/webp, image/gif"
            onChange={changeImage}
          />
          <div className="space-y-4">
            <input type='range' min={0} max={5} step={0.01} value={zoom} onChange={e => setZoom(Number(e.target.value))} />
            <Button onClick={resetCanvas}>Reset</Button>
          </div>
          <div className="space-y-4">
            <div className='rounded-full'
              style={{
                width: 100,
                height: 100,
                backgroundImage: `url(${encodeURI(bgPatternSvg)})`
              }}
            >
              <img className="rounded-full" src={URL.createObjectURL(croppedImage!)}></img>
              {/* these to fix lag on subsequent? */}
              {/* {URL.revokeObjectURL()} */}
              {/* react 18 deferred hooks */}
              {/* useLayoutEffect */}
            </div>
            <div>{croppedImage?.size} bytes</div>
            <div>{croppedImage?.type}</div>
            <Button onClick={saveImage}>Save</Button>
          </div>
        </div>
      </div>

      {/* need to figure out why offscreencanvas removed in typescript lib.dom */}
      <canvas className="hidden" ref={croppedRef} />
    </>
  );
};

