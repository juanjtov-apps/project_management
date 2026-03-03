-- Migration: Add material_documents table for attaching files to material items
-- Supports installation manuals, layouts, specs, and other documents

CREATE TABLE IF NOT EXISTS client_portal.material_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id uuid NOT NULL,
    project_id varchar NOT NULL,
    document_path text NOT NULL,
    file_name text NOT NULL,
    mime_type text,
    uploaded_by varchar NOT NULL,
    created_at timestamptz DEFAULT now(),
    CONSTRAINT fk_matdoc_item FOREIGN KEY(item_id)
        REFERENCES client_portal.material_items(id) ON DELETE CASCADE,
    CONSTRAINT fk_matdoc_project FOREIGN KEY(project_id)
        REFERENCES public.projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_matdoc_user FOREIGN KEY(uploaded_by)
        REFERENCES public.users(id) ON DELETE RESTRICT
);
