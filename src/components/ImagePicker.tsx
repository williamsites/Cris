import { useRef } from 'react';
import { Icon } from './Icon';
import { useToast } from './Toast';

/**
 * Campo de imagem: aceita URL, upload do dispositivo (vira dataURL) ou uma sugestão pronta.
 * O upload fica salvo dentro da própria base do SaaS, então funciona offline e no Cloudflare.
 */
export function ImagePicker({
  label, value, onChange, suggestions = [], aspect = '16 / 9', round = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suggestions?: string[];
  aspect?: string;
  round?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const pick = (file?: File) => {
    if (!file) return;
    if (file.size > 1.6 * 1024 * 1024) {
      toast('Imagem grande demais (máx. 1,6 MB). Use uma foto menor ou uma URL.', 'err');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result));
    reader.onerror = () => toast('Não foi possível ler o arquivo.', 'err');
    reader.readAsDataURL(file);
  };

  return (
    <div className="field">
      <label>{label}</label>
      <div className="flex" style={{ alignItems: 'flex-start' }}>
        <div
          style={{
            width: 104, aspectRatio: round ? '1 / 1' : aspect, borderRadius: round ? '50%' : 18,
            overflow: 'hidden', border: '1px solid var(--line-strong)', flex: 'none', background: 'var(--surface-3)',
          }}
        >
          {value ? (
            <img src={value} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--text-muted)' }}>
              <Icon name="image" />
            </div>
          )}
        </div>
        <div className="col" style={{ flex: 1, minWidth: 0 }}>
          <input
            className="input"
            placeholder="https://... (link da imagem)"
            value={value.startsWith('data:') ? '' : value}
            onChange={(e) => onChange(e.target.value)}
          />
          <div className="flex flex-wrap">
            <button type="button" className="btn btn-sm" onClick={() => input.current?.click()}>
              <Icon name="upload" size={16} /> Enviar foto
            </button>
            {value && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange('')}>
                <Icon name="trash" size={16} /> Remover
              </button>
            )}
          </div>
          {suggestions.length > 0 && (
            <div className="flex flex-wrap">
              {suggestions.map((s, i) => (
                <button
                  key={s}
                  type="button"
                  className="gallery-item"
                  style={{ width: 46, height: 46, padding: 0, cursor: 'pointer', borderRadius: 12 }}
                  onClick={() => onChange(s)}
                  aria-label={`Usar imagem sugerida ${i + 1}`}
                >
                  <img src={s} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        hidden
        onChange={(e) => pick(e.target.files?.[0])}
      />
    </div>
  );
}
