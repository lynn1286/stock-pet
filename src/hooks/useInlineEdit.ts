import { useState, useCallback } from 'react';

type EditField = 'quantity' | 'cost_price';

interface EditingState {
  secid: string;
  field: EditField;
}

export function useInlineEdit() {
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = useCallback((secid: string, field: EditField, current: number) => {
    setEditing({ secid, field });
    setEditValue(current > 0 ? String(current) : '');
  }, []);

  const cancelEdit = useCallback(() => {
    setEditing(null);
    setEditValue('');
  }, []);

  const handleEditKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setEditing(null);
      setEditValue('');
    }
  }, []);

  return {
    editing,
    editValue,
    setEditValue,
    startEdit,
    cancelEdit,
    handleEditKey,
  };
}
