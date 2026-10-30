import React, { useState } from 'react';
import { BRAND_LOGO_PATH } from './types';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  theme?: 'light' | 'dark';
  showTagline?: boolean;
  className?: string;
}

/**
 * Hiển thị Logo chính thức của 365MD (Auto365 Mỹ Đình - Hà Nội).
 * Tích hợp bộ lọc xử lý ảnh SVG Unsharp Mask + Contrast Threshold trực tiếp trên file ảnh gốc
 * (/assets/aistudio/image_c3d3afd9.png) kết hợp lớp Vector HD sắc nét ở mọi độ phân giải màn hình.
 */
export const BrandLogo365MD: React.FC<BrandLogoProps> = ({
  size = 'md',
  theme = 'light',
  showTagline = false,
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  const dims = {
    sm: { boxH: 'h-9', imgW: 'w-32', badgePx: 'px-2.5 py-1' },
    md: { boxH: 'h-11', imgW: 'w-40', badgePx: 'px-3 py-1.5' },
    lg: { boxH: 'h-14', imgW: 'w-48', badgePx: 'px-3.5 py-2' },
    xl: { boxH: 'h-16', imgW: 'w-56', badgePx: 'px-4 py-2' },
  }[size];

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Bộ lọc SVG Khử mờ & Tăng độ nét cạnh (Unsharp Mask + High-Contrast De-artifact) */}
      <svg className="sr-only" width="0" height="0" aria-hidden="true">
        <defs>
          <filter id="sharpen-365md-logo" x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
            {/* Tăng độ nét chi tiết viền chữ bằng ma trận tích chập (Unsharp convolution kernel) */}
            <feConvolveMatrix
              order="3 3"
              preserveAlpha="true"
              kernelMatrix="0 -0.85 0 -0.85 4.4 -0.85 0 -0.85 0"
              result="sharpened"
            />
            {/* Khử nhiễu nền xám JPEG, làm trắng tuyệt đối nền và làm đậm chữ Đen / Đỏ */}
            <feComponentTransfer in="sharpened" result="crisp">
              <feFuncR type="linear" slope="1.38" intercept="-0.18" />
              <feFuncG type="linear" slope="1.38" intercept="-0.18" />
              <feFuncB type="linear" slope="1.38" intercept="-0.18" />
            </feComponentTransfer>
          </filter>
        </defs>
      </svg>

      <div
        className={`relative flex items-center justify-center bg-white rounded-lg overflow-hidden ${dims.boxH} ${dims.imgW} ${dims.badgePx} ${
          theme === 'dark'
            ? 'ring-1 ring-white/15 shadow-sm'
            : 'border border-slate-200/90 shadow-xs'
        }`}
      >
        {!imgError ? (
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            <img
              src={BRAND_LOGO_PATH}
              alt="Auto365 Mỹ Đình - Hà Nội (365MD)"
              onError={() => setImgError(true)}
              style={{
                filter: 'url(#sharpen-365md-logo) saturate(1.25)',
                clipPath: 'inset(2% 1% 15% 1%)',
              }}
              className="w-full h-[118%] object-contain object-top transform scale-[1.06] translate-y-[4%]"
            />
          </div>
        ) : (
          /* Fallback Vector HD chuẩn nhận diện Auto365 Mỹ Đình - Hà Nội */
          <div className="flex flex-col items-center justify-center leading-none">
            <div className="flex items-baseline tracking-tight font-black text-base">
              <span className="text-slate-950">Auto</span>
              <span className="text-rose-600">365</span>
            </div>
            <span className="text-[9px] font-extrabold tracking-[0.18em] text-slate-900 mt-0.5">
              MY DINH - HA NOI
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

