import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ContentFolder } from "@/lib/services/content"

type CreateFolderDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  folders: ContentFolder[]
  newFolderName: string
  newFolderParentId: string
  setNewFolderName: (value: string) => void
  setNewFolderParentId: (value: string) => void
  handleCreateFolder: () => void
  isCreating: boolean
}

export function CreateFolderDialog({
  open,
  onOpenChange,
  folders,
  newFolderName,
  newFolderParentId,
  setNewFolderName,
  setNewFolderParentId,
  handleCreateFolder,
  isCreating,
}: CreateFolderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New folder</DialogTitle>
          <DialogDescription>
            Create a folder to organize your content. You can add subfolders later.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="folder-name">Name</Label>
            <Input
              id="folder-name"
              placeholder="e.g. Training videos"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="folder-parent">Parent folder</Label>
            <Select value={newFolderParentId} onValueChange={setNewFolderParentId}>
              <SelectTrigger id="folder-parent">
                <SelectValue placeholder="Select folder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="root">Root (no parent)</SelectItem>
                {folders.map((f) => (
                  <SelectItem key={f.id} value={String(f.id)}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreateFolder} disabled={!newFolderName.trim() || isCreating}>
            {isCreating ? "Creating…" : "Create folder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

