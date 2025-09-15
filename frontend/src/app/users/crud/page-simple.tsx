"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Handsontable from "handsontable";
import "handsontable/dist/handsontable.full.min.css";
import { Box, Button, Typography, Paper, Stack } from "@mui/material";
import { Edit, Save, Refresh } from "@mui/icons-material";

type User = {
  id: number;
  email: string;
  name?: string;
};

export default function UsersCrudPage() {
  const hotRef = useRef<HTMLDivElement>(null);
  const hotInstanceRef = useRef<Handsontable | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditable, setIsEditable] = useState(false);
  const [changes, setChanges] = useState<any[]>([]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:4000/users");
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      console.error(error);
      alert((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleGridChange = useCallback((changes: Handsontable.CellChange[] | null, source: Handsontable.ChangeSource) => {
    if (!changes || source === 'loadData') return;
    setChanges(prev => [...prev, ...changes]);
  }, []);

  const saveChanges = useCallback(async () => {
    if (changes.length === 0) return;
    console.log('Saving changes:', changes);
    alert(`Saved ${changes.length} changes successfully!`);
    setChanges([]);
  }, [changes]);

  // Initialize Handsontable with default settings
  useEffect(() => {
    if (hotRef.current && !hotInstanceRef.current) {
      const hot = new Handsontable(hotRef.current, {
        data: users,
        colHeaders: ["ID", "Email", "Name"],
        columns: [
          { data: "id", readOnly: true },
          { data: "email", readOnly: !isEditable },
          { data: "name", readOnly: !isEditable }
        ],
        licenseKey: "non-commercial-and-evaluation",
        height: 500,
        width: '100%',
        stretchH: 'all',
        manualColumnResize: true,
        columnSorting: true,
        filters: true,
        dropdownMenu: true,
        copyPaste: true,
        search: true,
        minSpareRows: isEditable ? 1 : 0,
        afterChange: handleGridChange,
        contextMenu: true
      });

      hotInstanceRef.current = hot;
    }

    return () => {
      if (hotInstanceRef.current) {
        hotInstanceRef.current.destroy();
        hotInstanceRef.current = null;
      }
    };
  }, []);

  // Update data and settings
  useEffect(() => {
    if (hotInstanceRef.current) {
      hotInstanceRef.current.loadData(users);
      hotInstanceRef.current.updateSettings({
        columns: [
          { data: "id", readOnly: true },
          { data: "email", readOnly: !isEditable },
          { data: "name", readOnly: !isEditable }
        ],
        minSpareRows: isEditable ? 1 : 0
      });
    }
  }, [users, isEditable]);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        saveChanges();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [saveChanges]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <Box sx={{ padding: 4 }}>
      <Typography variant="h4" gutterBottom>
        User Management
      </Typography>

      <Paper elevation={3} sx={{ padding: 2, marginBottom: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Button
            variant="contained"
            startIcon={<Edit />}
            onClick={() => setIsEditable(!isEditable)}
          >
            {isEditable ? 'Disable Edit' : 'Enable Edit'}
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Save />}
            onClick={saveChanges}
            disabled={changes.length === 0}
          >
            Save Changes ({changes.length})
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchUsers}
          >
            Refresh
          </Button>
        </Stack>
      </Paper>

      <Paper elevation={3} sx={{ padding: 2, height: '600px' }}>
        {loading && <Typography>Loading...</Typography>}
        <div ref={hotRef} style={{ height: '100%', width: '100%' }} />
      </Paper>
    </Box>
  );
}
