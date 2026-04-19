# Shared Components Architecture

> Reusable UI components extracted from tool pages (funnel-pages, nextland).  
> **Location**: `src/tools/shared/components/`  
> **Total LOC**: 590 lines | **Type Safety**: ✅ Zero errors | **Props Average**: 10

---

## Component Overview

### 1. ProjectDialog

**Purpose**: Generic project selector with modal UI  
**Lines**: 106  
**Props**: 8 required/optional

```typescript
interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: ProjectOption[];
  selectedProjectId: string | null;
  onProjectSelect: (projectId: string) => void;
  triggerLabel?: string;
  emptyStateText?: string;
  isLoading?: boolean;
  disabled?: boolean;
}
```

**Features**:
- Radix Dialog primitive (accessible modal)
- Single selection with visual feedback
- Customizable labels + empty state
- Loading + disabled states
- Portal rendering (prevents z-index issues)

**Usage**:
```typescript
<ProjectDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  projects={projectList}
  selectedProjectId={selectedId}
  onProjectSelect={setSelectedId}
  triggerLabel="Choose project"
/>
```

**Reusability**: ✅ Works for any tool (generic ProjectOption interface)

---

### 2. StepCard

**Purpose**: Visualize individual generation steps with status + actions  
**Lines**: 84  
**Generic Props**: `<TStatus extends string>`

```typescript
interface StepCardProps<TStatus extends string = string> {
  step: Omit<ToolStepState<string>, 'status'> & { status: TStatus };
  statusLabel: Record<TStatus, string>;
  statusBadgeClass: Record<TStatus, string>;
  onViewClick?: () => void;
  onRegenerateClick?: () => void;
  isGenerating?: boolean;
  showActions?: boolean;
}
```

**Features**:
- Generic status type (tool-specific status map)
- Content preview (500 char limit)
- Error state display
- Optional action buttons (view, regenerate)
- Badge with customizable styles

**Usage**:
```typescript
const STEP_STATUS_BADGE = {
  idle: 'border-slate-400 bg-slate-200 text-slate-950',
  running: 'border-amber-400 bg-amber-200 text-amber-950',
  done: 'border-emerald-400 bg-emerald-200 text-emerald-950',
  error: 'border-rose-400 bg-rose-200 text-rose-950',
};

<StepCard<'idle' | 'running' | 'done' | 'error'>
  step={step}
  statusLabel={STEP_STATUS_LABEL}
  statusBadgeClass={STEP_STATUS_BADGE}
  onViewClick={() => router.push(`/artifacts/${step.artifactId}`)}
  isGenerating={running}
/>
```

**Reusability**: ✅ Generic TStatus allows any tool to define custom statuses

---

### 3. StatusChecklist

**Purpose**: Multi-item progress tracker with collapsible UI  
**Lines**: 134  
**Props**: 8 required/optional

```typescript
interface StatusChecklistProps {
  title?: string;
  description?: string;
  items: ChecklistItem[];
  statusLabels?: Record<'todo' | 'active' | 'done' | 'error', string>;
  statusBadgeClass?: Record<'todo' | 'active' | 'done' | 'error', string>;
  isCollapsible?: boolean;
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
}

interface ChecklistItem {
  id: string;
  label: string;
  status: 'todo' | 'active' | 'done' | 'error';
  errorMessage?: string;
}
```

**Features**:
- Collapsible details element (native HTML)
- Dynamic items array (variable length)
- Color-coded badges (status-dependent)
- Error messages per item
- Auto-collapse on generation start

**Usage**:
```typescript
<StatusChecklist
  title="Workflow Status"
  items={[
    { id: 'extraction', label: 'Estrazione', status: 'done' },
    { id: 'generation', label: 'Generazione', status: 'active', errorMessage: '' },
  ]}
  isOpen={isStatusOpen}
  onToggle={(open) => setIsStatusOpen(open)}
/>
```

**Reusability**: ✅ Works with any status set + dynamic item count

---

### 4. ToolSetup

**Purpose**: Centralized form setup (project/file/model/tone selection)  
**Lines**: 262  
**Props**: 15 required/optional

```typescript
interface ToolSetupProps {
  config: ToolSetupConfig;
  onProjectChange: (projectId: string) => void;
  onModelChange: (modelId: string) => void;
  onToneChange: (tone: string) => void;
  onNotesChange: (notes: string) => void;
  onFileChange: (file: File) => void;
  onProjectDialogChange: (open: boolean) => void;
  projects: ProjectOption[];
  models: ModelOption[];
  tones: readonly string[];
  toneHints?: Record<string, string>;
  primaryAction: { label: string; disabled: boolean; onClick?: () => void };
  secondaryActions?: Array<{ label: string; onClick: () => void; disabled?: boolean }>;
  title?: string;
  description?: string;
  hasExtractionReady?: boolean;
  selectedProject?: ProjectOption | null;
  loadingProjects?: boolean;
  loadingModels?: boolean;
  children?: ReactNode;
}
```

**Features**:
- Integrated ProjectDialog
- File input with MIME type validation
- Model selection (Select component)
- Tone selection (Select + custom hints)
- Primary + secondary action buttons (flexible)
- Extensible `children` prop for tool-specific fields
- Notes textarea (shown conditionally)

**Usage**:
```typescript
<ToolSetup
  config={{ projectId, model, tone, notes, ... }}
  onProjectChange={setProjectId}
  onModelChange={setModel}
  onToneChange={setTone}
  onNotesChange={setNotes}
  onFileChange={handleFileUpload}
  onProjectDialogChange={setIsDialogOpen}
  projects={projects}
  models={models}
  tones={['professional', 'casual', 'formal', 'technical']}
  primaryAction={{ label: 'Generate', disabled: !canGenerate, onClick: handleGenerate }}
  secondaryActions={[{ label: 'Reset', onClick: handleReset }]}
>
  {/* Optional: tool-specific fields */}
</ToolSetup>
```

**Reusability**: ✅ Props-driven, extensible with children

---

## Component Design Principles

### 1. Generic Type System
- Avoid hardcoding status/step types
- Use `<T extends string>` for status, key, etc.
- Tool-specific types defined in `tool-specific/types.ts`

### 2. Props-Based Configuration
- Max 15 top-level props per component
- Prefer config objects over scattered props
- Use defaults for common cases (e.g., `statusLabels`, `statusBadgeClass`)

### 3. Accessibility
- Semantic HTML (`<button>`, `<select>`, `<details>`)
- ARIA attributes where needed (`aria-label`, `role`, etc.)
- Keyboard navigation support (Radix primitives)

### 4. Composition Over Inheritance
- Use React props + composition
- No class components or HOCs
- Easy to test + mock

### 5. Single Responsibility
- Each component has one purpose
- Dependencies isolated
- No business logic (handlers passed as props)

---

## Styling & Tailwind

All components use **Tailwind CSS** with consistent patterns:

| Class Category | Pattern |
|---|---|
| **Spacing** | `gap-3`, `px-3`, `py-2.5` |
| **Colors** | Status-driven (slate, amber, emerald, rose) |
| **Typography** | `text-sm`, `font-medium`, semantic sizes |
| **Borders** | `border-slate-200`, `rounded-lg`, `rounded-2xl` for summaries |
| **States** | `hover:`, `disabled:`, `group-open:` |

---

## Testing Strategy

### Unit Tests (Jest + React Testing Library)

```typescript
describe('ProjectDialog', () => {
  it('renders trigger button with selected project name', () => {
    const { getByRole } = render(
      <ProjectDialog
        projects={[{ id: '1', name: 'My Project' }]}
        selectedProjectId="1"
        open={false}
        onOpenChange={() => {}}
        onProjectSelect={() => {}}
      />
    );
    expect(getByRole('button')).toHaveTextContent('My Project');
  });

  it('opens dialog on trigger click', async () => {
    const { getByRole, getByText } = render(<ProjectDialog ... />);
    fireEvent.click(getByRole('button'));
    expect(getByText('Scegli un progetto')).toBeInTheDocument();
  });
});
```

### Storybook Stories

```typescript
export meta: Meta<typeof StepCard> = {
  component: StepCard,
  parameters: { layout: 'centered' },
};

export const Done: Story = {
  args: {
    step: { key: 'optin', title: 'Optin Page', status: 'done', content: 'Lorem...', artifactId: '123', error: null },
    statusLabel: { done: 'Completato', ... },
    statusBadgeClass: { done: 'border-emerald-400 ...', ... },
  },
};
```

---

## Integration with Tool Pages

### Funnel Pages Example

```typescript
// imports
import { ToolSetup, StatusChecklist, StepCard } from '@/tools/shared/components';
import { useExtraction, useStepGeneration } from '@/tools/shared';

function FunnelPagesToolContent() {
  // hooks
  const extraction = useExtraction(extractionConfig);
  const generation = useStepGeneration(generationConfig);
  
  // state
  const [projectId, setProjectId] = useState('');
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);

  return (
    <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
      {/* Setup */}
      <ToolSetup
        config={{ projectId, model, tone, notes, ... }}
        onProjectChange={setProjectId}
        projects={projects}
        models={models}
        tones={TONES}
        primaryAction={primaryAction}
      />

      {/* Status */}
      <StatusChecklist
        items={[
          { id: 'extraction', label: 'Estrazione', status: extractionStatus },
          { id: 'generation', label: 'Generazione', status: generationStatus },
        ]}
        isOpen={isStatusOpen}
        onToggle={setIsStatusOpen}
      />

      {/* Steps */}
      <div className="space-y-3">
        {generation.steps.map((step) => (
          <StepCard
            key={step.key}
            step={step}
            statusLabel={STEP_STATUS_LABEL}
            statusBadgeClass={STEP_STATUS_BADGE}
          />
        ))}
      </div>
    </div>
  );
}
```

**Result**: ~300 lines total (vs 1162 original)

---

## File Organization

```
src/tools/shared/
├── components/
│   ├── ProjectDialog.tsx      # 106 lines
│   ├── StepCard.tsx           # 84 lines
│   ├── StatusChecklist.tsx    # 134 lines
│   ├── ToolSetup.tsx          # 262 lines
│   └── index.ts               # Barrel exports
├── hooks/
│   ├── useExtraction.ts       # 211 lines
│   ├── useStepGeneration.ts   # 120 lines
│   └── (others)
├── lib/
│   ├── retryLogic.ts          # 76 lines
│   └── streamHelpers.ts       # 40 lines
├── types/
│   └── tool.types.ts          # 85 lines
├── index.ts                   # Main barrel export
├── README.md                  # Quick start + architecture
└── COMPONENTS.md              # This file
```

---

## Roadmap

### Now (Phase 3 Complete)
- ✅ 4 components extracted (590 lines)
- ✅ All components type-safe + generic
- ✅ Zero TypeScript errors

### Phase 4-5 (Tool Refactoring)
- Integrate into funnel-pages (~300 lines)
- Integrate into nextland (~280 lines)
- Reduce duplication from 2194 → ~850 lines

### Phase 6 (Testing + Polish)
- Unit + integration tests
- Storybook stories for each component
- Documentation + usage examples

---

## FAQ

**Q: Can I use these components outside tools?**  
A: Yes! They're generic enough for any tool or page. Just provide config via props.

**Q: What if I need a custom status badge?**  
A: Pass `statusBadgeClass` prop with your custom Tailwind classes. No hardcoding.

**Q: How do I add a new tool?**  
A: Import shared components + hooks, define tool-specific config, done. ~300 lines.

**Q: Are these components tested?**  
A: Unit test stubs exist; comprehensive tests in Phase 6.

---

Generated: 2026-04-18  
Status: POC Phase 3 Complete ✅
