import React, { useState } from 'react';
import { Download, Smartphone, Share, CheckCircle2, ExternalLink } from 'lucide-react';
import { usePWAInstall, useOnlineStatus } from './usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'banner' | 'full';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = () => {
  return null;
};

const _UnusedPWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'header' }) => {
  const { isInstallable, isInstalled, isIOS, isZaloOrInApp, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  if (isInstalled && !installSuccess) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) {
        setInstallSuccess(true);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      {variant === 'banner' ? (
        <div className="bg-gradient-to-r from-rose-600 via-orange-600 to-amber-500 text-white px-3.5 py-2.5 rounded-xl shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-white p-1 shrink-0 flex items-center justify-center shadow-xs">
              <img src="/pwa-192x192.png" alt="365MD App" className="w-full h-full object-contain rounded" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-extrabold truncate">
                Cài đặt App Auto365 Mỹ Đình (365MD) về Điện thoại
              </p>
              <p className="text-[11px] text-orange-100 truncate">
                Mở nhanh 1 chạm từ màn hình chính · Có logo 365MD riêng
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleInstallClick}
            className="px-3.5 py-2 bg-white text-rose-700 hover:bg-orange-50 font-extrabold text-xs rounded-lg shadow-xs whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <Smartphone className="w-4 h-4" />
            <span>Cài đặt App 365MD về máy</span>
          </button>
        </div>
      ) : variant === 'full' ? (
        <button
          type="button"
          onClick={handleInstallClick}
          className="w-full py-2.5 px-4 bg-gradient-to-r from-rose-600 to-orange-500 hover:from-rose-700 hover:to-orange-600 text-white font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
        >
          <Smartphone className="w-4 h-4" />
          <span>Cài đặt App 365MD về máy (Có Logo trên Màn hình chính)</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleInstallClick}
          className="px-2.5 sm:px-3.5 py-2 text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-orange-500 hover:from-rose-700 hover:to-orange-600 rounded-lg shadow-xs whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer transition-all"
          title="Cài đặt App Auto365 Mỹ Đình về màn hình chính điện thoại / máy tính"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Cài đặt App 365MD về máy</span>
          <span className="sm:hidden">Cài App</span>
        </button>
      )}

      {/* Modal hướng dẫn 1 chạm khi mở trên iPhone (Safari), Zalo hoặc trình duyệt chưa kích hoạt prompt tự động */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-5 sm:p-6 shadow-2xl space-y-4 text-slate-900">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-3">
                <img
                  src="/pwa-192x192.png"
                  alt="365MD Logo"
                  className="w-12 h-12 rounded-xl border border-slate-200 shadow-xs"
                />
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-rose-100 text-rose-700">
                    PWA APP CHÍNH THỨC
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                    Cài đặt App 365MD về Điện thoại
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-900 px-2 py-1 rounded-lg bg-slate-100 cursor-pointer"
              >
                Đóng ✕
              </button>
            </div>

            {isZaloOrInApp && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <ExternalLink className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Anh đang mở link bên trong Zalo / Facebook:</span>
                </p>
                <p>
                  Hãy bấm vào biểu tượng <strong>3 chấm (...)</strong> ở góc trên cùng bên phải màn hình, chọn{' '}
                  <strong>&ldquo;Mở bằng Safari&rdquo;</strong> (iPhone) hoặc{' '}
                  <strong>&ldquo;Mở bằng Trình duyệt / Chrome&rdquo;</strong> (Android) để cài App ra màn hình chính!
                </p>
              </div>
            )}

            {isIOS ? (
              <div className="space-y-3 text-xs leading-relaxed text-slate-700">
                <p className="font-bold text-slate-900 text-sm">
                  Hướng dẫn cài đặt 1 chạm trên iPhone / iPad (Safari):
                </p>
                <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-sky-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <p>
                      Bấm vào nút <strong>Chia sẻ (Share)</strong>{' '}
                      <Share className="w-3.5 h-3.5 inline text-sky-700 mx-0.5" /> (biểu tượng ô vuông có mũi tên chỉ lên) ở thanh dưới cùng của trình duyệt Safari.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-sky-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <p>
                      Vuốt xuống và bấm chọn dòng{' '}
                      <strong className="text-slate-900">&ldquo;Thêm vào MH chính&rdquo; (Add to Home Screen)</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-sky-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <p>
                      Bấm <strong>&ldquo;Thêm&rdquo; (Add)</strong> ở góc trên bên phải. Biểu tượng <strong>Auto365 Mỹ Đình</strong> sẽ xuất hiện ngay trên màn hình điện thoại!
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs leading-relaxed text-slate-700">
                <p className="font-bold text-slate-900 text-sm">
                  Hướng dẫn cài đặt lên Màn hình chính Điện thoại (Android / Chrome) hoặc Máy tính:
                </p>
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <p>
                      Bấm vào biểu tượng <strong>3 chấm dọc (⋮)</strong> ở góc trên bên phải trình duyệt Chrome (hoặc biểu tượng{' '}
                      <Download className="w-3.5 h-3.5 inline text-emerald-700" /> trên thanh địa chỉ).
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <p>
                      Chọn <strong>&ldquo;Cài đặt ứng dụng&rdquo; (Install app)</strong> hoặc{' '}
                      <strong>&ldquo;Thêm vào màn hình chính&rdquo; (Add to Home screen)</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <p>
                      Xác nhận <strong>&ldquo;Cài đặt&rdquo;</strong> để đưa logo <strong>Auto365 Mỹ Đình</strong> ra ngoài màn hình điện thoại.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Đã hiểu · Đóng hướng dẫn</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-16 lg:bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-lg">
      <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
      <span>Chế độ Offline — Đang sử dụng dữ liệu lưu đệm trên máy.</span>
    </div>
  );
};
