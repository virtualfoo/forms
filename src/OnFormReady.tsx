import React, { useEffect, useRef } from 'react';
import { useRecoilValueLoadable } from './recoilOrMinimalRecoil';
import { useFormId } from './hooks';
import { Callback0 } from './types';
import { $values, $formReadyDelay, $formReadyDelayKey } from './selectors';

function useFormReadyLoadable(formId: string) {
  return [
    useRecoilValueLoadable($formReadyDelay(formId)) as any,
    useRecoilValueLoadable($values(formId)) as any,
  ].reduce((acc, { state }) => acc && state === 'hasValue', true);
}

type OnFormReadyInnerProps = {
  formId: string;
  cb: Callback0;
};

const OnFormReadyInner = ({ cb, formId }: OnFormReadyInnerProps) => {
  const ready = useFormReadyLoadable(formId);
  const run = useRef(false);

  useEffect(() => {
    console.log(ready, run);
    if (ready && !run.current) {
      cb();
      run.current = true;
    }
  }, [ready]);

  return null;
};

export type OnFormReadyProps = {
  formId?: string;
  cb: Callback0;
};

const OnFormReady = ({ cb, formId }: OnFormReadyProps) => {
  const formIdProp = useFormId(formId);
  const key = useRecoilValueLoadable($formReadyDelayKey(formIdProp)) as any;
  return <OnFormReadyInner cb={cb} formId={formIdProp} key={key.contents} />;
};

export default OnFormReady;
