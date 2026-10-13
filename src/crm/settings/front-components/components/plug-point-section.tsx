import { useTranslate } from 'twenty-sdk/front-component';
import { Section } from 'twenty-ui/components';
import { Input } from 'twenty-ui/primitives/input';
import { Card } from 'twenty-ui/primitives/surfaces';

import { Row, Toggle } from 'src/crm/settings/front-components/components/settings-controls';
import { type PlugPointSectionText } from 'src/crm/settings/types/plug-point-section-text.type';
import { ChoiceSelect } from 'src/shared/front-components/choice-select';
import { type PlugPointConfig } from 'src/shared/plug/types/plug-point-config.type';

type PlugPointSectionProps = {
  text: PlugPointSectionText;
  point: PlugPointConfig;
  plugKey: string | null;
  plugKeySet: boolean;
  isReadOnly: boolean;
  setPoint: (changes: Partial<PlugPointConfig>) => void;
  setPlugKey: (value: string) => void;
};

export const PlugPointSection = ({ text, point, plugKey, plugKeySet, isReadOnly, setPoint, setPlugKey }: PlugPointSectionProps) => {
  const { t } = useTranslate();

  return (
    <Section.Root>
      <Section.Header title={t(text.title)} />
      <Card.Root rounded>
        <Card.Content>
          <Toggle
            label={t(text.enabled)}
            checked={point.enabled}
            disabled={isReadOnly}
            onChange={(value) => setPoint({ enabled: value })}
          />
          <Row label={t(text.target)}>
            <ChoiceSelect
              value={point.target?.kind ?? 'route'}
              options={[
                { value: 'route', label: t(text.route) },
                { value: 'url', label: t(text.url) },
              ]}
              disabled={isReadOnly}
              onChange={(kind) => setPoint({ target: kind === 'route' ? { kind, path: '' } : { kind, url: '' } })}
            />
            <Input
              value={point.target === null ? '' : point.target.kind === 'route' ? point.target.path : point.target.url}
              disabled={isReadOnly}
              onValueChange={(value) => setPoint({ target: point.target?.kind === 'url' ? { kind: 'url', url: value } : { kind: 'route', path: value } })}
            />
          </Row>
          <Row label={t(text.timeout)}>
            <Input value={String(point.timeoutSeconds)} type="number" disabled={isReadOnly} onValueChange={(value) => setPoint({ timeoutSeconds: Number(value) })} />
          </Row>
          <Row label={t(text.onError)}>
            <ChoiceSelect
              value={point.onError}
              options={[
                { value: 'DEFAULT', label: t(text.useBuiltIn) },
                { value: 'SKIP', label: t(text.skip) },
              ]}
              disabled={isReadOnly}
              onChange={(value) => setPoint({ onError: value })}
            />
          </Row>
          <Row label={t(text.leftOut)}>
            <ChoiceSelect
              value={String(point.leftOut ?? 'DEFAULT')}
              options={[
                { value: 'DEFAULT', label: t(text.assignBuiltIn) },
                { value: 'UNTOUCHED', label: t(text.leaveThem) },
              ]}
              disabled={isReadOnly}
              onChange={(value) => setPoint({ leftOut: value })}
            />
          </Row>
          <Row label={plugKeySet ? t(text.keySet) : t(text.keyNew)}>
            <Input value={plugKey ?? ''} type="password" disabled={isReadOnly} onValueChange={setPlugKey} />
          </Row>
        </Card.Content>
      </Card.Root>
    </Section.Root>
  );
};
