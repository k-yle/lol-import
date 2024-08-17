import { useContext, useState } from 'react';
import { Alert, Button, Modal, TextInput } from '@mantine/core';
import { IconAlertTriangle, IconCheck } from '@tabler/icons-react';
import { getAuthToken } from 'osm-api';
import type { FELight } from '../../../parser/src/helpers/types';
import { t } from '../i18n';
import { AuthContext } from '../context/AuthContext';

enum STATE {
  CLOSED,
  IDLE,
  LOADING,
  SUCCESS,
  ERROR,
}

export const IgnoreSuggestionsModal: React.FC<{
  ialaId: string;
  light: FELight;
}> = ({ ialaId, light }) => {
  const { user } = useContext(AuthContext);
  const [state, setState] = useState(STATE.CLOSED);
  const [comment, setComment] = useState('');

  const ignoreSuggestions = async () => {
    setState(STATE.LOADING);
    try {
      const response = await fetch('/api/ignore', {
        method: 'POST',
        body: JSON.stringify({
          ialaId,
          comment,
          diffHash: light.osm!.diffHash,
        }),
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      }).then((r) => r.json());
      if (response.error) throw new Error(response.error);

      setState(STATE.SUCCESS);
    } catch {
      setState(STATE.ERROR);
    }
  };

  if (!user) return null;

  return (
    <>
      <Button variant="light" onClick={() => setState(STATE.IDLE)}>
        {t('LightPage.ignore.btn')}
      </Button>
      <Modal
        opened={state !== STATE.CLOSED}
        onClose={() => setState(STATE.CLOSED)}
        title={t('LightPage.ignore.btn')}
      >
        {state === STATE.ERROR ? (
          <Alert
            variant="light"
            color="red"
            title={t('IgnoreSuggestionsModal.error')}
            icon={<IconAlertTriangle />}
          />
        ) : state === STATE.SUCCESS ? (
          <Alert
            variant="light"
            color="green"
            title={t('IgnoreSuggestionsModal.success')}
            icon={<IconCheck />}
          />
        ) : (
          <>
            <TextInput
              label={t('IgnoreSuggestionsModal.comment')}
              description={t('IgnoreSuggestionsModal.comment-desc')}
              placeholder={t('IgnoreSuggestionsModal.comment-placeholder')}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
            <Button
              onClick={ignoreSuggestions}
              loading={state === STATE.LOADING}
              mt={16}
            >
              {t('_.submit')}
            </Button>
          </>
        )}
      </Modal>
    </>
  );
};
