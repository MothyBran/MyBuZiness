// src/components/ui/RowActions.tsx
import React from "react";

type Props = {
  onDetail?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
};

export const RowActions: React.FC<Props> = ({ onDetail, onEdit, onDelete }) => (
  <div className="row-actions">
    <button className="btn btn--ghost" onClick={onDetail} title="Details ansehen">🔎 Details</button>
    <button className="btn" onClick={onEdit} title="Bearbeiten">✏️ Bearbeiten</button>
    <button className="btn btn--ghost" onClick={onDelete} title="Löschen">🗑️ Löschen</button>
  </div>
);
