"use client"

import { useState } from "react"
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import type {
  ProductModuleWithItems,
  ProductModuleItemWithContent,
} from "@/lib/services/products"
import { ContentTypeIcon, formatDuration } from "./content-type-icon"

export type SortableLessonRowProps = {
  item: ProductModuleItemWithContent
  isEditing: boolean
  editingValue: string
  onEditingValueChange: (v: string) => void
  onStartEdit: (e: React.MouseEvent) => void
  onSubmitEdit: () => void
  onCancelEdit: () => void
  onRemoveLesson: () => void
  updateLessonPending: boolean
  removePending: boolean
}

export function SortableLessonRow({
  item,
  isEditing,
  editingValue,
  onEditingValueChange,
  onStartEdit,
  onSubmitEdit,
  onCancelEdit,
  onRemoveLesson,
  updateLessonPending,
  removePending,
}: SortableLessonRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 border-b border-border last:border-0 px-4 py-3 hover:bg-muted/20 transition-colors ${isDragging ? "opacity-60 bg-muted/30" : ""}`}
    >
      <div
        className="touch-none shrink-0"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab active:cursor-grabbing" />
      </div>
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
        <ContentTypeIcon type={item.content_items?.type ?? "pdf"} />
      </div>
      <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
        {isEditing ? (
          <Input
            value={editingValue}
            onChange={(e) => onEditingValueChange(e.target.value)}
            onBlur={onSubmitEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                onSubmitEdit()
              }
              if (e.key === "Escape") onCancelEdit()
            }}
            disabled={updateLessonPending}
            className="h-8 text-sm"
            autoFocus
          />
        ) : (
          <span
            className="text-sm text-foreground cursor-text rounded px-1.5 py-0.5 -mx-1.5 -my-0.5 hover:bg-muted/50 inline-block"
            onClick={onStartEdit}
          >
            {item.title || item.content_items?.name || "Untitled"}
          </span>
        )}
        {!isEditing && item.content_items?.duration != null && (
          <span className="ml-2 text-xs text-muted-foreground">
            {formatDuration(item.content_items.duration)}
          </span>
        )}
      </div>
      <Badge variant="secondary" className="text-xs capitalize shrink-0">
        {item.content_items?.type ?? "—"}
      </Badge>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
        onClick={onRemoveLesson}
        disabled={removePending}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

export type ModuleCardProps = {
  style?: React.CSSProperties
  dragHandleProps?: { [key: string]: unknown }
  isDragging?: boolean
  ref?: React.Ref<HTMLDivElement | null>
  module: ProductModuleWithItems
  isExpanded: boolean
  onToggle: () => void
  onAddLesson: () => void
  onRemoveLesson: (itemId: number) => void
  onDeleteModule: () => void
  onUpdateModuleTitle: (moduleId: number, title: string) => void
  onUpdateLessonTitle: (itemId: number, title: string | null) => void
  onReorderLessons?: (
    moduleId: number,
    updates: { itemId: number; position: number }[]
  ) => void
  removePending: boolean
  updateModulePending: boolean
  updateLessonPending: boolean
  deleteModulePending: boolean
  reorderLessonsPending?: boolean
}

export function ModuleCard({
  ref: refForward,
  style: sortableStyle,
  dragHandleProps,
  isDragging: isModuleDragging,
  module,
  isExpanded,
  onToggle,
  onAddLesson,
  onRemoveLesson,
  onDeleteModule,
  onUpdateModuleTitle,
  onUpdateLessonTitle,
  onReorderLessons,
  removePending,
  updateModulePending,
  updateLessonPending,
  deleteModulePending,
  reorderLessonsPending,
}: ModuleCardProps) {
  const items = module.product_module_items ?? []
  const [editingModuleId, setEditingModuleId] = useState<number | null>(null)
  const [editingModuleValue, setEditingModuleValue] = useState("")
  const [editingItemId, setEditingItemId] = useState<number | null>(null)
  const [editingItemValue, setEditingItemValue] = useState("")

  const startEditModule = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingModuleId(module.id)
    setEditingModuleValue(module.title)
  }

  const submitModuleTitle = () => {
    if (editingModuleId === null) return
    const trimmed = editingModuleValue.trim()
    if (trimmed) onUpdateModuleTitle(editingModuleId, trimmed)
    setEditingModuleId(null)
  }

  const startEditLesson = (
    e: React.MouseEvent,
    item: ProductModuleItemWithContent
  ) => {
    e.stopPropagation()
    setEditingItemId(item.id)
    setEditingItemValue(item.title ?? item.content_items?.name ?? "Untitled")
  }

  const submitLessonTitle = (itemId: number) => {
    if (editingItemId === null) return
    const trimmed = editingItemValue.trim()
    onUpdateLessonTitle(itemId, trimmed || null)
    setEditingItemId(null)
  }

  const handleLessonDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over == null || active.id === over.id || !onReorderLessons) return
    const itemIds = items.map((i) => i.id)
    const oldIndex = itemIds.indexOf(Number(active.id))
    const newIndex = itemIds.indexOf(Number(over.id))
    if (oldIndex === -1 || newIndex === -1) return
    const newOrder = arrayMove(itemIds, oldIndex, newIndex)
    onReorderLessons(
      module.id,
      newOrder.map((itemId, position) => ({ itemId, position }))
    )
  }

  const lessonSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  return (
    <div
      ref={refForward}
      style={sortableStyle}
      className={`rounded-xl border border-border bg-card overflow-hidden transition-opacity ${isModuleDragging ? "opacity-60" : ""}`}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onToggle()}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/30 transition-colors cursor-pointer"
      >
        <div
          className="touch-none shrink-0"
          {...(dragHandleProps ?? {})}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
        </div>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <div
          className="flex-1 min-w-0 flex items-center"
          onClick={(e) => e.stopPropagation()}
        >
          {editingModuleId === module.id ? (
            <Input
              value={editingModuleValue}
              onChange={(e) => setEditingModuleValue(e.target.value)}
              onBlur={submitModuleTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  submitModuleTitle()
                }
                if (e.key === "Escape") {
                  setEditingModuleId(null)
                  setEditingModuleValue(module.title)
                }
              }}
              disabled={updateModulePending}
              className="h-8 text-sm font-semibold"
              autoFocus
            />
          ) : (
            <span
              className="text-sm font-semibold text-foreground cursor-text rounded px-1.5 py-0.5 -mx-1.5 -my-0.5 hover:bg-muted/50"
              onClick={startEditModule}
            >
              {module.title}
            </span>
          )}
        </div>
        <Badge variant="secondary" className="text-xs shrink-0">
          {items.length} lesson{items.length !== 1 ? "s" : ""}
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation()
            onDeleteModule()
          }}
          disabled={deleteModulePending}
          title="Delete module"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      {isExpanded && (
        <div className="border-t border-border">
          <DndContext
            sensors={lessonSensors}
            onDragEnd={handleLessonDragEnd}
          >
            <SortableContext
              items={items.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              {items.map((item) => (
                <SortableLessonRow
                  key={item.id}
                  item={item}
                  isEditing={editingItemId === item.id}
                  editingValue={editingItemValue}
                  onEditingValueChange={setEditingItemValue}
                  onStartEdit={(e) => startEditLesson(e, item)}
                  onSubmitEdit={() => submitLessonTitle(item.id)}
                  onCancelEdit={() => {
                    setEditingItemId(null)
                    setEditingItemValue(
                      item.title ?? item.content_items?.name ?? "Untitled"
                    )
                  }}
                  onRemoveLesson={() => onRemoveLesson(item.id)}
                  updateLessonPending={updateLessonPending}
                  removePending={removePending}
                />
              ))}
            </SortableContext>
          </DndContext>
          <div className="px-4 py-3">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground"
              onClick={onAddLesson}
            >
              <Plus className="h-3.5 w-3.5" />
              Add lesson
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export type SortableModuleCardProps = {
  module: ProductModuleWithItems
  isExpanded: boolean
  onToggle: () => void
  onAddLesson: () => void
  onRemoveLesson: (itemId: number) => void
  onDeleteModule: () => void
  onUpdateModuleTitle: (moduleId: number, title: string) => void
  onUpdateLessonTitle: (itemId: number, title: string | null) => void
  onReorderLessons: (
    moduleId: number,
    updates: { itemId: number; position: number }[]
  ) => void
  removePending: boolean
  updateModulePending: boolean
  updateLessonPending: boolean
  deleteModulePending: boolean
  reorderLessonsPending: boolean
}

export function SortableModuleCard({
  module,
  isExpanded,
  onToggle,
  onAddLesson,
  onRemoveLesson,
  onDeleteModule,
  onUpdateModuleTitle,
  onUpdateLessonTitle,
  onReorderLessons,
  removePending,
  updateModulePending,
  updateLessonPending,
  deleteModulePending,
  reorderLessonsPending,
}: SortableModuleCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <ModuleCard
      ref={setNodeRef}
      style={style}
      dragHandleProps={{ ...attributes, ...listeners }}
      isDragging={isDragging}
      module={module}
      isExpanded={isExpanded}
      onToggle={onToggle}
      onAddLesson={onAddLesson}
      onRemoveLesson={onRemoveLesson}
      onDeleteModule={onDeleteModule}
      onUpdateModuleTitle={onUpdateModuleTitle}
      onUpdateLessonTitle={onUpdateLessonTitle}
      onReorderLessons={onReorderLessons}
      removePending={removePending}
      updateModulePending={updateModulePending}
      updateLessonPending={updateLessonPending}
      deleteModulePending={deleteModulePending}
      reorderLessonsPending={reorderLessonsPending}
    />
  )
}
