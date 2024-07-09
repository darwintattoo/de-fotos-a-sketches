import React, { useState, useRef, useEffect } from 'react';
import { Camera, Download, SlidersHorizontal, Pencil, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PhotoToStencilApp = () => {
  const [image, setImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [contrast, setContrast] = useState(50);
  const [threshold, setThreshold] = useState(128);
  const [lineThickness, setLineThickness] = useState(50);
  const [sharpness, setSharpness] = useState(50);
  const [zoom, setZoom] = useState(100);
  const [selectedPreset, setSelectedPreset] = useState('custom');
  const [selectedStyle, setSelectedStyle] = useState('stencil');
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

  const presets = {
    custom: { contrast: 50, threshold: 128, lineThickness: 50, sharpness: 50 },
    tattoo: { contrast: 70, threshold: 200, lineThickness: 30, sharpness: 70 },
    woodworking: { contrast: 60, threshold: 150, lineThickness: 70, sharpness: 60 },
    glasswork: { contrast: 80, threshold: 180, lineThickness: 40, sharpness: 80 },
  };

  const styles = [
    { id: 'stencil', name: 'Stencil' },
    { id: 'lineart', name: 'Line Art' },
    { id: 'pattern', name: 'Pattern' },
  ];

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.substr(0, 5) === "image") {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result);
        setProcessedImage(null);
      }
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file && file.type.substr(0, 5) === "image") {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result);
        setProcessedImage(null);
      }
      reader.readAsDataURL(file);
    }
  };

  const applySharpness = (data, width, height, factor) => {
    const sharpenKernel = [
      0, -1, 0,
      -1, 5, -1,
      0, -1, 0
    ];
    const kernelSize = 3;
    const halfKernel = Math.floor(kernelSize / 2);
    const tempData = new Uint8ClampedArray(data);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0;
        for (let ky = 0; ky < kernelSize; ky++) {
          for (let kx = 0; kx < kernelSize; kx++) {
            const px = Math.min(width - 1, Math.max(0, x + kx - halfKernel));
            const py = Math.min(height - 1, Math.max(0, y + ky - halfKernel));
            const i = (py * width + px) * 4;
            const weight = sharpenKernel[ky * kernelSize + kx];
            r += tempData[i] * weight;
            g += tempData[i + 1] * weight;
            b += tempData[i + 2] * weight;
          }
        }
        const i = (y * width + x) * 4;
        data[i] = factor * r + (1 - factor) * tempData[i];
        data[i + 1] = factor * g + (1 - factor) * tempData[i + 1];
        data[i + 2] = factor * b + (1 - factor) * tempData[i + 2];
      }
    }
  };

  const applyStencilEffect = () => {
    if (!image) return;

    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;

      // Dibuja un fondo blanco
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(img, 0, 0);
      let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Aplicar nitidez
      applySharpness(data, canvas.width, canvas.height, sharpness / 100);

      // Aplicar contraste
      const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
      for (let i = 0; i < data.length; i += 4) {
        data[i] = factor * (data[i] - 128) + 128;
        data[i + 1] = factor * (data[i + 1] - 128) + 128;
        data[i + 2] = factor * (data[i + 2] - 128) + 128;
      }

      // Aplicar umbral y estilo
      for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        let val;
        switch (selectedStyle) {
          case 'stencil':
            val = avg < threshold ? 0 : 255;
            break;
          case 'lineart':
            val = Math.abs(avg - threshold) < lineThickness ? 0 : 255;
            break;
          case 'pattern':
            val = (Math.floor(i / 4 / canvas.width) + Math.floor(i / 4 % canvas.width)) % 2 === 0 
              ? (avg < threshold ? 0 : 255) 
              : (avg < threshold ? 255 : 0);
            break;
          default:
            val = avg < threshold ? 0 : 255;
        }
        // Invertir los colores para que el fondo sea blanco y las líneas negras
        data[i] = data[i + 1] = data[i + 2] = 255 - val;
      }

      ctx.putImageData(imageData, 0, 0);
      setProcessedImage(canvas.toDataURL('image/png'));
    };
    img.src = image;
  };

  useEffect(() => {
    if (image) {
      applyStencilEffect();
    }
  }, [image, contrast, threshold, lineThickness, sharpness, selectedStyle]);

  const handlePresetChange = (value) => {
    setSelectedPreset(value);
    const preset = presets[value];
    setContrast(preset.contrast);
    setThreshold(preset.threshold);
    setLineThickness(preset.lineThickness);
    setSharpness(preset.sharpness);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-center">Trazado Automático a Stencil/Patrón</h1>
        
        {!image ? (
          <div 
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer"
            onClick={() => fileInputRef.current.click()}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <Camera className="mx-auto mb-4" size={48} />
            <p className="mb-4">Arrastra tu imagen aquí o haz clic para subir</p>
            <Button onClick={() => fileInputRef.current.click()}>Subir Imagen</Button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*" 
              className="hidden"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative h-64 bg-white rounded-lg overflow-hidden border border-gray-300">
              <div style={{
                width: '100%',
                height: '100%',
                overflow: 'auto',
              }}>
                <div style={{
                  width: `${zoom}%`,
                  height: `${zoom}%`,
                  position: 'relative',
                }}>
                  <img src={image} alt="Original" className="absolute top-0 left-0 w-full h-full object-cover" />
                  <div 
                    className="absolute top-0 left-0 w-full h-full overflow-hidden"
                    style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                  >
                    <img src={processedImage} alt="Processed" className="absolute top-0 left-0 w-full h-full object-cover" />
                  </div>
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-black cursor-ew-resize"
                    style={{ left: `${sliderPosition}%` }}
                    onMouseDown={(e) => {
                      const handleMouseMove = (e) => {
                        const rect = e.target.parentElement.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        setSliderPosition((x / rect.width) * 100);
                      };
                      const handleMouseUp = () => {
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                      };
                      document.addEventListener('mousemove', handleMouseMove);
                      document.addEventListener('mouseup', handleMouseUp);
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <Button onClick={() => setZoom(Math.max(100, zoom - 10))}>
                <ZoomOut size={16} />
              </Button>
              <span>{zoom}%</span>
              <Button onClick={() => setZoom(Math.min(200, zoom + 10))}>
                <ZoomIn size={16} />
              </Button>
            </div>

            <Select value={selectedPreset} onValueChange={handlePresetChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un preset" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Personalizado</SelectItem>
                <SelectItem value="tattoo">Tatuaje</SelectItem>
                <SelectItem value="woodworking">Trabajo en madera</SelectItem>
                <SelectItem value="glasswork">Vidriera</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="space-y-2">
              <div className="flex items-center">
                <SlidersHorizontal size={16} className="mr-2" />
                <span className="text-sm">Contraste</span>
              </div>
              <Slider
                value={[contrast]}
                onValueChange={(value) => {
                  setContrast(value[0]);
                  setSelectedPreset('custom');
                }}
                max={100}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center">
                <SlidersHorizontal size={16} className="mr-2" />
                <span className="text-sm">Umbral</span>
              </div>
              <Slider
                value={[threshold]}
                onValueChange={(value) => {
                  setThreshold(value[0]);
                  setSelectedPreset('custom');
                }}
                max={255}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center">
                <Pencil size={16} className="mr-2" />
                <span className="text-sm">Grosor de línea</span>
              </div>
              <Slider
                value={[lineThickness]}
                onValueChange={(value) => {
                  setLineThickness(value[0]);
                  setSelectedPreset('custom');
                }}
                max={100}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center">
                <SlidersHorizontal size={16} className="mr-2" />
                <span className="text-sm">Nitidez</span>
              </div>
              <Slider
                value={[sharpness]}
                onValueChange={(value) => {
                  setSharpness(value[0]);
                  setSelectedPreset('custom');
                }}
                max={100}
                step={1}
              />
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
              {styles.map((style) => (
                <Button
                  key={style.id}
                  onClick={() => setSelectedStyle(style.id)}
                  variant={selectedStyle === style.id ? "default" : "outline"}
                >
                  {style.name}
                </Button>
              ))}
            </div>

            <Button className="w-full" onClick={() => {
              const link = document.createElement('a');
              link.download = 'stencil_pattern.png';
              link.href = processedImage;
              link.click();
            }}>
              <Download className="mr-2" size={16} />
              Descargar Diseño
            </Button>
          </div>
        )}
      </div>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

export default PhotoToStencilApp;
