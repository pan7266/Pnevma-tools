"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import jsQR from "jsqr";
import QRCode from "qrcode";
import { useAppSettings } from "@/components/AppSettings";
import { QrIcon } from "@/components/ToolIcons";
import { InfoButton } from "@/components/ui/InfoButton";
import { MetricCard } from "@/components/ui/MetricCard";
import { parseQrPayload, type ParsedQrPayload, type QrPayloadType } from "@/lib/calculators/qr";
import { getLocale } from "@/locales";

type CameraState = "idle" | "starting" | "running" | "blocked" | "unavailable";
type ScanSource = "Camera" | "Image upload" | "Clipboard";
type ModalState = { title: string; body: string } | null;

interface QrScanRecord {
  id: string;
  raw: string;
  parsed: ParsedQrPayload;
  source: ScanSource;
  createdAt: string;
}

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const QR_HISTORY_KEY = "pnevma.qr.history.v1";
const TYPE_LABEL_KEYS: Record<QrPayloadType, string> = {
  Website: "typeWebsite",
  Instagram: "typeInstagram",
  Facebook: "typeFacebook",
  LinkedIn: "typeLinkedIn",
  YouTube: "typeYouTube",
  TikTok: "typeTikTok",
  WhatsApp: "typeWhatsApp",
  Telegram: "typeTelegram",
  Map: "typeMap",
  Wifi: "typeWifi",
  Email: "typeEmail",
  Sms: "typeSms",
  Phone: "typePhone",
  Contact: "typeContact",
  Calendar: "typeCalendar",
  Product: "typeProduct",
  Text: "typeText",
};
const SOURCE_LABEL_KEYS: Record<ScanSource, string> = {
  Camera: "sourceCamera",
  "Image upload": "sourceImageUpload",
  Clipboard: "sourceClipboard",
};
const FIELD_LABEL_KEYS: Record<string, string> = {
  URL: "fieldURL",
  Domain: "fieldDomain",
  Platform: "fieldPlatform",
  Username: "fieldUsername",
  Network: "fieldNetwork",
  Security: "fieldSecurity",
  Password: "fieldPassword",
  "Hidden network": "fieldHiddenNetwork",
  To: "fieldTo",
  Subject: "fieldSubject",
  Body: "fieldBody",
  Number: "fieldNumber",
  Message: "fieldMessage",
  Name: "fieldName",
  Organization: "fieldOrganization",
  Phone: "fieldPhone",
  Email: "fieldEmail",
  Website: "fieldWebsite",
  Address: "fieldAddress",
  Latitude: "fieldLatitude",
  Longitude: "fieldLongitude",
  Query: "fieldQuery",
  Event: "fieldEvent",
  Starts: "fieldStarts",
  Ends: "fieldEnds",
  Location: "fieldLocation",
  Description: "fieldDescription",
  Code: "fieldCode",
  Text: "fieldText",
};

function makeRecord(raw: string, source: ScanSource): QrScanRecord {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    raw,
    parsed: parseQrPayload(raw),
    source,
    createdAt: new Date().toISOString(),
  };
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(iso));
}

function decodeCanvas(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context || canvas.width <= 0 || canvas.height <= 0) {
    return null;
  }
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "attemptBoth" });
  return code?.data || null;
}

function isBrowserReadableImage(file: File) {
  return file.type.startsWith("image/") || /\.(bmp|gif|jpe?g|png|svg|webp)$/i.test(file.name);
}

function typeLabel(type: QrPayloadType, labels: Record<string, string>) {
  return labels[TYPE_LABEL_KEYS[type]] || type;
}

function sourceLabel(source: ScanSource, labels: Record<string, string>) {
  return labels[SOURCE_LABEL_KEYS[source]] || source;
}

function fieldLabel(label: string, labels: Record<string, string>) {
  return labels[FIELD_LABEL_KEYS[label]] || label;
}

function actionLabel(parsed: ParsedQrPayload, labels: Record<string, string>) {
  if (parsed.type === "Email") return labels.createEmail;
  if (parsed.type === "Sms") return labels.createSms;
  if (parsed.type === "Phone") return labels.callNumber;
  if (parsed.type === "Map") return labels.openMap;
  return labels.openLink;
}

function downloadFileName(type: QrPayloadType) {
  return `pnevma-${type.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-qr.svg`;
}

function DetailRow({ label, value, copyLabel, onCopy }: { label: string; value: string; copyLabel: string; onCopy: (value: string) => void }) {
  return (
    <div className="qr-detail-row">
      <span>{label}</span>
      <div>
        <strong>{value}</strong>
        <button className="mini-button qr-copy-mini" type="button" onClick={() => onCopy(value)}>
          {copyLabel}
        </button>
      </div>
    </div>
  );
}

export function QrScanner() {
  const { lang } = useAppSettings();
  const labels = getLocale(lang).qr;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastCameraTextRef = useRef("");
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [status, setStatus] = useState(labels.chooseSource);
  const [result, setResult] = useState<QrScanRecord | null>(null);
  const [history, setHistory] = useState<QrScanRecord[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [generatedSvg, setGeneratedSvg] = useState("");
  const [generatedSvgUrl, setGeneratedSvgUrl] = useState<string | null>(null);
  const [isGeneratingSvg, setIsGeneratingSvg] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(QR_HISTORY_KEY);
      const parsed = stored ? JSON.parse(stored) as QrScanRecord[] : [];
      if (Array.isArray(parsed)) {
        setHistory(parsed.slice(0, 8));
      }
    } catch {
      window.localStorage.removeItem(QR_HISTORY_KEY);
    } finally {
      setStorageReady(true);
    }
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    window.localStorage.setItem(QR_HISTORY_KEY, JSON.stringify(history.slice(0, 8)));
  }, [history, storageReady]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!result) {
      setStatus(labels.chooseSource);
    }
  }, [labels.chooseSource, result]);

  useEffect(() => {
    if (!generatedSvg) {
      setGeneratedSvgUrl(null);
      return;
    }

    const url = URL.createObjectURL(new Blob([generatedSvg], { type: "image/svg+xml;charset=utf-8" }));
    setGeneratedSvgUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [generatedSvg]);

  useEffect(() => {
    let cancelled = false;
    if (!result) {
      setGeneratedSvg("");
      setIsGeneratingSvg(false);
      return;
    }

    setIsGeneratingSvg(true);
    QRCode.toString(result.raw, {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 2,
      width: 512,
      color: {
        dark: "#111827",
        light: "#ffffff",
      },
    }).then((svg) => {
      if (cancelled) return;
      setGeneratedSvg(svg);
      setStatus(labels.svgReady);
    }).catch(() => {
      if (cancelled) return;
      setGeneratedSvg("");
      setStatus(labels.svgFailed);
    }).finally(() => {
      if (!cancelled) setIsGeneratingSvg(false);
    });

    return () => {
      cancelled = true;
    };
  }, [labels.svgFailed, labels.svgReady, result]);

  const handleDecoded = useCallback((raw: string, source: ScanSource) => {
    if (source === "Camera" && raw === lastCameraTextRef.current) {
      return;
    }

    if (source === "Camera") {
      lastCameraTextRef.current = raw;
    }

    const record = makeRecord(raw, source);
    setResult(record);
    setHistory((current) => [record, ...current.filter((item) => item.raw !== raw)].slice(0, 8));
    setStatus(`${labels.decodedStatus} ${typeLabel(record.parsed.type, labels)} (${sourceLabel(source, labels)}).`);
  }, [labels]);

  const scanCameraFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { willReadFrequently: true });

    if (video && canvas && context && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      const width = video.videoWidth;
      const height = video.videoHeight;
      if (width > 0 && height > 0) {
        canvas.width = width;
        canvas.height = height;
        context.drawImage(video, 0, 0, width, height);
        const decoded = decodeCanvas(canvas);
        if (decoded) {
          handleDecoded(decoded, "Camera");
        }
      }
    }

    frameRef.current = window.requestAnimationFrame(scanCameraFrame);
  }, [handleDecoded]);

  const stopCamera = useCallback(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraState("idle");
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState("unavailable");
      setStatus(labels.cameraApiUnavailableStatus);
      return;
    }

    setCameraState("starting");
    setStatus(labels.waitingPermission);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" } },
      });
      streamRef.current = stream;
      lastCameraTextRef.current = "";

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraState("running");
      setStatus(labels.cameraScanning);
      if (frameRef.current === null) {
        frameRef.current = window.requestAnimationFrame(scanCameraFrame);
      }
    } catch {
      setCameraState("blocked");
      setStatus(labels.cameraAccessBlocked);
    }
  }, [labels.cameraAccessBlocked, labels.cameraApiUnavailableStatus, labels.cameraScanning, labels.waitingPermission, scanCameraFrame]);

  const decodeImageFile = useCallback(async (file: File, source: ScanSource) => {
    if (!isBrowserReadableImage(file)) {
      setStatus(labels.uploadReadable);
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setStatus(labels.imageTooLarge);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return objectUrl;
    });
    setStatus(`${labels.readingFile} ${file.name || labels.clipboardImage}.`);

    try {
      const image = new Image();
      const loaded = new Promise<HTMLImageElement>((resolve, reject) => {
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Image could not be read."));
      });
      image.src = objectUrl;
      const loadedImage = await loaded;
      const canvas = canvasRef.current || document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        setStatus(labels.browserCannotRead);
        return;
      }

      canvas.width = loadedImage.naturalWidth;
      canvas.height = loadedImage.naturalHeight;
      context.drawImage(loadedImage, 0, 0);
      const decoded = decodeCanvas(canvas);

      if (decoded) {
        handleDecoded(decoded, source);
      } else {
        setStatus(labels.noQrFound);
      }
    } catch {
      setStatus(labels.imageDecodeFailed);
    }
  }, [handleDecoded, labels.browserCannotRead, labels.clipboardImage, labels.imageDecodeFailed, labels.imageTooLarge, labels.noQrFound, labels.readingFile, labels.uploadReadable]);

  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (file) {
      void decodeImageFile(file, "Image upload");
    }
    event.currentTarget.value = "";
  }, [decodeImageFile]);

  const handleDrop = useCallback((event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      void decodeImageFile(file, "Image upload");
    }
  }, [decodeImageFile]);

  const pasteFromClipboard = useCallback(async () => {
    if (!navigator.clipboard?.read) {
      setStatus(labels.pressCtrlV);
      return;
    }

    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((type) => type.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          const file = new File([blob], "clipboard-image", { type: imageType });
          await decodeImageFile(file, "Clipboard");
          return;
        }
      }
      setStatus(labels.clipboardEmpty);
    } catch {
      setStatus(labels.clipboardBlocked);
    }
  }, [decodeImageFile, labels.clipboardBlocked, labels.clipboardEmpty, labels.pressCtrlV]);

  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      const file = Array.from(event.clipboardData?.files || []).find((item) => isBrowserReadableImage(item));
      if (file) {
        void decodeImageFile(file, "Clipboard");
      }
    }

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [decodeImageFile]);

  const copyText = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus(labels.copied);
    } catch {
      setStatus(labels.copyFailed);
    }
  }, [labels.copied, labels.copyFailed]);

  const downloadSvg = useCallback(() => {
    if (!generatedSvg || !result) return;

    const url = URL.createObjectURL(new Blob([generatedSvg], { type: "image/svg+xml;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = downloadFileName(result.parsed.type);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 100);
    setStatus(labels.downloadStarted);
  }, [generatedSvg, labels.downloadStarted, result]);

  const currentType = result ? typeLabel(result.parsed.type, labels) : labels.ready;
  const currentSource = result ? sourceLabel(result.source, labels) : labels.none;
  const currentSummary = result?.parsed.summary || labels.noScanYet;

  return (
    <main className="app qr-tool">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true"><QrIcon /></div>
          <div>
            <h1>{labels.title}</h1>
            <p className="subhead">{labels.subtitle}</p>
          </div>
        </div>
      </header>

      <section className="panel panel-pad qr-workbench">
        <div className="qr-layout">
          <section className="stack">
            <section className="mini-panel">
              <div className="qr-section-head">
                <h2>{labels.scanSource}</h2>
                <InfoButton
                  title={labels.scanSource}
                  body={labels.scanSourceInfo}
                  onOpen={setModal}
                />
              </div>

              <div className="qr-action-grid">
                <button className="button" type="button" disabled={cameraState === "starting" || cameraState === "running"} onClick={() => void startCamera()}>
                  {cameraState === "starting" ? labels.starting : labels.startCamera}
                </button>
                <button className="button secondary" type="button" disabled={cameraState !== "running"} onClick={stopCamera}>
                  {labels.stopCamera}
                </button>
                <label className="mini-button qr-file-button">
                  {labels.uploadImage}
                  <input type="file" accept="image/*,.svg" onChange={handleFileChange} />
                </label>
                <button className="mini-button" type="button" onClick={() => void pasteFromClipboard()}>
                  {labels.pasteImage}
                </button>
              </div>

              <div className={`qr-camera-frame ${cameraState === "running" ? "active" : ""}`}>
                <video ref={videoRef} className="qr-video" muted playsInline />
                {cameraState !== "running" ? (
                  <div className="qr-camera-placeholder">
                    <QrIcon />
                    <span>{cameraState === "blocked" ? labels.cameraBlocked : cameraState === "unavailable" ? labels.cameraUnavailable : labels.cameraPreview}</span>
                  </div>
                ) : null}
              </div>

              <label
                className={`qr-dropzone ${isDragging ? "active" : ""}`}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <input type="file" accept="image/*,.svg" onChange={handleFileChange} />
                <span>{labels.dropQr}</span>
                <small>{labels.fileHint}</small>
              </label>

              {previewUrl ? (
                <div className="qr-preview">
                  <img src={previewUrl} alt="Uploaded QR preview" />
                </div>
              ) : null}

              <p className="field-hint">{status}</p>
              <canvas ref={canvasRef} hidden />
            </section>

            <section className="mini-panel">
              <div className="qr-section-head">
                <h2>{labels.safety}</h2>
                <InfoButton
                  title={labels.safety}
                  body={labels.safetyInfo}
                  onOpen={setModal}
                />
              </div>
              <ul className="qr-note-list">
                <li>{labels.safetyLink}</li>
                <li>{labels.safetyLocal}</li>
                <li>{labels.safetyCamera}</li>
              </ul>
            </section>
          </section>

          <section className="stack">
            <section className="mini-panel qr-result-panel">
              <div className="qr-section-head">
                <h2>{labels.resultTitle}</h2>
                <InfoButton
                  title={labels.resultTitle}
                  body={labels.resultInfo}
                  onOpen={setModal}
                />
              </div>

              <div className="readouts">
                <MetricCard label={labels.typeMetric} value={currentType} sub={currentSummary} />
                <MetricCard label={labels.sourceMetric} value={currentSource} sub={result ? formatTime(result.createdAt) : labels.waitingForScan} />
              </div>

              {result ? (
                <>
                  <label className="qr-result-text">
                    <span className="label-line">{labels.rawResult}</span>
                    <textarea value={result.raw} readOnly />
                  </label>

                  <div className="button-row qr-result-actions">
                    <button className="button" type="button" onClick={() => void copyText(result.raw)}>
                      {labels.copyResult}
                    </button>
                    {result.parsed.actionHref ? (
                      <a
                        className="button secondary"
                        href={result.parsed.actionHref}
                        target={result.parsed.safeUrl ? "_blank" : undefined}
                        rel={result.parsed.safeUrl ? "noreferrer" : undefined}
                      >
                        {actionLabel(result.parsed, labels)}
                      </a>
                    ) : null}
                  </div>

                  <div className="qr-detail-grid">
                    {result.parsed.fields.map((field) => (
                      <DetailRow
                        key={`${field.label}-${field.value}`}
                        label={fieldLabel(field.label, labels)}
                        value={field.value}
                        copyLabel={labels.copy}
                        onCopy={(value) => void copyText(value)}
                      />
                    ))}
                  </div>

                  <div className="qr-regenerated">
                    <div className="qr-section-head">
                      <h3>{labels.regeneratedTitle}</h3>
                      <InfoButton title={labels.regeneratedTitle} body={labels.regeneratedInfo} onOpen={setModal} />
                    </div>
                    {generatedSvgUrl ? (
                      <div className="qr-generated-preview">
                        <img src={generatedSvgUrl} alt={labels.regeneratedTitle} />
                      </div>
                    ) : (
                      <div className="qr-empty-state compact">
                        <QrIcon />
                        <span>{isGeneratingSvg ? labels.generatingSvg : labels.regeneratedEmpty}</span>
                      </div>
                    )}
                    <button className="button qr-download-button" type="button" disabled={!generatedSvg} onClick={downloadSvg}>
                      {labels.downloadSvg}
                    </button>
                  </div>
                </>
              ) : (
                <div className="qr-empty-state">
                  <QrIcon />
                  <strong>{labels.emptyTitle}</strong>
                  <span>{labels.emptyBody}</span>
                </div>
              )}
            </section>

            <section className="mini-panel">
              <div className="qr-section-head">
                <h2>{labels.recentScans}</h2>
                {history.length ? (
                  <button className="mini-button" type="button" onClick={() => setHistory([])}>
                    {labels.clear}
                  </button>
                ) : null}
              </div>
              <div className="qr-history-list">
                {history.length ? history.map((item) => (
                  <button className="qr-history-item" type="button" key={item.id} onClick={() => setResult(item)}>
                    <span>{typeLabel(item.parsed.type, labels)}</span>
                    <strong>{item.parsed.summary}</strong>
                    <small>{sourceLabel(item.source, labels)} / {formatTime(item.createdAt)}</small>
                  </button>
                )) : <p className="field-hint">{labels.recentEmpty}</p>}
              </div>
            </section>
          </section>
        </div>
      </section>

      {modal ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setModal(null)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="qr-info-title" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <h2 id="qr-info-title">{modal.title}</h2>
              <button className="button secondary modal-close" type="button" onClick={() => setModal(null)}>{labels.close}</button>
            </div>
            <div className="modal-body-text">{modal.body}</div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
