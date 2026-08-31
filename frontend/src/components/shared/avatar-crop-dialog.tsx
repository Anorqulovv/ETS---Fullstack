import { useCallback, useRef, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

const OUTPUT_SIZE = 320; // final avatar hajmi (px)
const PREVIEW_SIZE = 280; // dialogdagi ko'rinadigan doira hajmi (px)

interface AvatarCropDialogProps {
  imageSrc: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCropped: (dataUrl: string) => void;
}

/**
 * Oddiy, kutubxonasiz canvas-asosidagi rasm kesish oynasi -- foydalanuvchi rasmni
 * surishi (drag) va kattalashtirishi (zoom slider) mumkin, natijada OUTPUT_SIZE x
 * OUTPUT_SIZE o'lchamdagi kvadrat JPEG data URL hosil bo'ladi.
 */
export function AvatarCropDialog({ imageSrc, open, onOpenChange, onCropped }: AvatarCropDialogProps) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const draggingRef = useRef<{ startX: number; startY: number; startOffsetX: number; startOffsetY: number } | null>(
    null,
  );

  function handleImageLoad() {
    const img = imgRef.current;
    if (!img) return;
    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }

  // Rasm PREVIEW_SIZE doirani har doim to'liq qoplashi uchun boshlang'ich masshtab.
  function baseScale(): number {
    if (!naturalSize) return 1;
    return Math.max(PREVIEW_SIZE / naturalSize.w, PREVIEW_SIZE / naturalSize.h);
  }

  function clampOffset(next: { x: number; y: number }, currentZoom: number) {
    if (!naturalSize) return next;
    const scale = baseScale() * currentZoom;
    const displayedW = naturalSize.w * scale;
    const displayedH = naturalSize.h * scale;
    const maxX = Math.max(0, (displayedW - PREVIEW_SIZE) / 2);
    const maxY = Math.max(0, (displayedH - PREVIEW_SIZE) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    };
  }

  function handlePointerDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    draggingRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startOffsetX: offset.x,
      startOffsetY: offset.y,
    };
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!draggingRef.current) return;
    const dx = e.clientX - draggingRef.current.startX;
    const dy = e.clientY - draggingRef.current.startY;
    setOffset(
      clampOffset(
        { x: draggingRef.current.startOffsetX + dx, y: draggingRef.current.startOffsetY + dy },
        zoom,
      ),
    );
  }

  function handlePointerUp() {
    draggingRef.current = null;
  }

  function handleZoomChange(value: number[]) {
    const next = value[0] ?? 1;
    setZoom(next);
    setOffset((prev) => clampOffset(prev, next));
  }

  const handleSave = useCallback(() => {
    const img = imgRef.current;
    if (!img || !naturalSize) return;

    const scale = baseScale() * zoom;
    const displayedW = naturalSize.w * scale;
    const displayedH = naturalSize.h * scale;

    // Preview doirasining markazi -- rasmning qaysi qismi ko'rinib turibdi, shuni
    // asl piksel koordinatalariga o'tkazamiz.
    const cropCenterXOnDisplayed = displayedW / 2 - offset.x;
    const cropCenterYOnDisplayed = displayedH / 2 - offset.y;
    const cropSizeOnDisplayed = PREVIEW_SIZE;

    const sx = (cropCenterXOnDisplayed - cropSizeOnDisplayed / 2) / scale;
    const sy = (cropCenterYOnDisplayed - cropSizeOnDisplayed / 2) / scale;
    const sSize = cropSizeOnDisplayed / scale;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    onCropped(dataUrl);
    onOpenChange(false);
  }, [naturalSize, zoom, offset, onCropped, onOpenChange]);

  const scale = baseScale() * zoom;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rasmni moslashtirish</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          <div
            className="relative overflow-hidden rounded-full border bg-muted"
            style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE, touchAction: "none", cursor: "grab" }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            {imageSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={imgRef}
                src={imageSrc}
                alt=""
                onLoad={handleImageLoad}
                draggable={false}
                className="pointer-events-none absolute select-none"
                style={
                  naturalSize
                    ? {
                        width: naturalSize.w * scale,
                        height: naturalSize.h * scale,
                        left: PREVIEW_SIZE / 2 - (naturalSize.w * scale) / 2 + offset.x,
                        top: PREVIEW_SIZE / 2 - (naturalSize.h * scale) / 2 + offset.y,
                      }
                    : undefined
                }
              />
            ) : null}
          </div>

          <div className="grid w-full gap-1.5">
            <Label className="text-xs text-muted-foreground">Kattalashtirish</Label>
            <Slider
              min={1}
              max={3}
              step={0.01}
              value={[zoom]}
              onValueChange={handleZoomChange}
              disabled={!naturalSize}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Rasmni surish uchun bosib turib harakatlantiring, kattalashtirish uchun slayderdan foydalaning.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Bekor qilish
          </Button>
          <Button onClick={handleSave} disabled={!naturalSize}>
            Saqlash
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
