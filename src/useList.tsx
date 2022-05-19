import { useEffect, useRef } from 'react';
import { useRecoilCallback, useRecoilState } from 'recoil';
import { fieldId, $field } from './selectors';
import { useFormId } from './hooks';
import { useFieldRegistration } from './internalHooks';
import useWarnOnChanged from './useWarnOnChanged';
import { FieldIdentification, Dict } from './types';
import uid from './uid';

const last = <T,>(xs: T[]) => xs[xs.length - 1];

export type UseListProps = FieldIdentification;

export type UseListResult = {
  fields: string[];
  add: () => string;
  addAt: (index: number) => string;
  remove: (index: number) => void;
  removeAll: () => void;
  swap: (a: number, b: number) => void;
  move: (a: number, b: number) => void;
  createRows: (rows: any[]) => Dict<any>;
};

// effectively reuse maximum of existing nodes
const useList = ({ formId: formIdProp, name }: UseListProps): UseListResult => {
  const formId = useFormId(formIdProp);

  useWarnOnChanged('formId', formId);
  useWarnOnChanged('name', name);

  const [fieldState, setFieldState] = useRecoilState(
    $field(fieldId(formId, name)),
  );
  const registration = useFieldRegistration(formId);

  // removed ids (nodes - atoms) are stored in a stack
  // and reused when new row is added (via generateNewName) to maximize memory optimization
  const namesToReuse = useRef<Set<string>>(new Set([]));

  const reset = useRecoilCallback(
    ({ reset }) =>
      () => {
        reset($field(fieldId(formId, name)));
      },
    [],
  );

  useEffect(() => {
    registration.add(name);
    setFieldState((state) => ({
      ...state,
      type: 'list',
    }));
    return () => {
      reset();
      registration.remove(name);
    };
  }, []);

  const removeName = (name: string) => {
    namesToReuse.current.add(last(name.split('.')));
  };

  const generateNewName = () => {
    const [reusedName] = namesToReuse.current;
    namesToReuse.current.delete(reusedName);
    return `${name}.${reusedName || uid()}`;
  };

  const add = () => {
    // problem with index as name is that children can be removed or change order
    const newName = generateNewName();
    setFieldState((state) => ({
      ...state,
      children: [...state.children, newName],
    }));
    return newName;
  };

  const addAt = (index: number) => {
    const newName = generateNewName();
    setFieldState((state) => {
      const children = [...state.children];
      children.splice(index, 0, newName);
      return {
        ...state,
        children,
      };
    });
    return newName;
  };

  const remove = (index: number) => {
    setFieldState((state) => ({
      ...state,
      children: state.children.filter((name, i) => {
        const x = i !== index;
        if (!x) {
          removeName(name);
        }
        return x;
      }),
    }));
  };

  const removeAll = () => {
    setFieldState((state) => {
      state.children.forEach(removeName);
      return {
        ...state,
        children: [],
      };
    });
  };

  const swap = (a: number, b: number) => {
    setFieldState((state) => {
      const ax = state.children[a];
      const bx = state.children[b];
      return {
        ...state,
        children: state.children.map((x, i) => {
          if (i === a) {
            return bx;
          }
          if (i === b) {
            return ax;
          }
          return x;
        }),
      };
    });
  };

  const move = (from: number, to: number) => {
    setFieldState((state) => {
      const before = state.children.slice(0, from);
      const after = state.children.slice(from + 1);
      const tempChildren = [...before, ...after];
      const beforeNew = tempChildren.slice(0, to);
      const afterNew = tempChildren.slice(to);
      return {
        ...state,
        children: [...beforeNew, state.children[from], ...afterNew],
      };
    });
  };

  // returns structure (dict with fully qualified names) suitable for form.setValues/form.setInitialValues
  // has side-effects
  const createRows = (rows: any[]) =>
    rows.reduce<Dict<any>>((acc, row) => {
      const rowName = add();
      Object.entries(row).forEach(([key, value]) => {
        acc[`${rowName}.${key}`] = value;
      });
      return acc;
    }, {});

  return {
    fields: fieldState.children,
    // manipulation
    add,
    addAt,
    remove,
    removeAll,
    swap,
    move,
    // helpers
    createRows,
  };
};

export default useList;
