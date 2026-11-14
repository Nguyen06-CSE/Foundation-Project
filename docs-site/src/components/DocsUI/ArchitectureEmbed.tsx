import React, { useState } from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import { ExternalLink, Maximize2, Layers, RefreshCw } from 'lucide-react';
import styles from './docs-ui.module.css';

interface ArchitectureEmbedProps {
  initialDiagram?: 'architecture' | 'flow';
}

export const ArchitectureEmbed: React.FC<ArchitectureEmbedProps> = ({
  initialDiagram = 'architecture',
}) => {
  const [selected, setSelected] = useState<'architecture' | 'flow'>(initialDiagram);

  const archUrl = useBaseUrl('/diagrams/foundation-system-architecture.html');
  const flowUrl = useBaseUrl('/diagrams/foundation-dataflow.html');

  const currentUrl = selected === 'architecture' ? archUrl : flowUrl;
  const currentTitle =
    selected === 'architecture'
      ? 'Sơ Đồ Kiến Trúc Hệ Thống (System Architecture)'
      : 'Sơ Đồ Luồng Dữ Liệu (Foundation Data Flow)';

  return (
    <div className={styles.archEmbedContainer}>
      <div className={styles.archEmbedHeader}>
        <div className={styles.archEmbedTitle}>
          <Layers size={17} color="#4f46e5" />
          <span>{currentTitle}</span>
        </div>

        <div className={styles.archEmbedActions}>
          <button
            type="button"
            className={styles.archActionBtn}
            onClick={() =>
              setSelected((prev) => (prev === 'architecture' ? 'flow' : 'architecture'))
            }
            title="Chuyển đổi sơ đồ"
          >
            <RefreshCw size={13} />
            <span>{selected === 'architecture' ? 'Xem Luồng Dữ Liệu' : 'Xem Kiến Trúc'}</span>
          </button>

          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.archActionBtn}
            title="Mở toàn màn hình trong tab mới"
          >
            <ExternalLink size={13} />
            <span>Mở Tab Mới</span>
          </a>
        </div>
      </div>

      <iframe
        src={currentUrl}
        title={currentTitle}
        className={styles.archEmbedFrame}
        loading="lazy"
      />
    </div>
  );
};
