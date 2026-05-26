import {
  RiArchiveLine,
  RiCircleLine,
  RiErrorWarningLine,
  RiFileLine,
  RiFileZipLine,
  RiFolderLine,
  RiKeyboardLine,
  RiLoader4Line,
  RiPauseFill,
  RiPlayFill,
  RiPushpinFill,
  RiPushpinLine,
  RiSettings4Line,
  RiTimerLine,
  RiUploadCloudLine,
} from "@remixicon/react";

const ICONS = {
  archive: RiArchiveLine,
  document: RiFileLine,
  file: RiFileLine,
  folder: RiFolderLine,
  keyboard: RiKeyboardLine,
  loader: RiLoader4Line,
  pause: RiPauseFill,
  pin: RiPushpinLine,
  pinned: RiPushpinFill,
  play: RiPlayFill,
  settings: RiSettings4Line,
  timer: RiTimerLine,
  upload: RiUploadCloudLine,
  warning: RiErrorWarningLine,
  zip: RiFileZipLine,
};

export default function Icon({ name, size = 20, className = "", ...props }) {
  const Component = ICONS[name] || RiCircleLine;
  return <Component size={size} className={className} aria-hidden="true" {...props} />;
}
