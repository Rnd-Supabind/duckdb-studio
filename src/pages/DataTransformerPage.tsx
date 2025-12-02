import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDuckDBContext } from '@/contexts/DuckDBContext';
import { useAuth } from '@/contexts/AuthContext';
import { useExecutionMode } from '@/contexts/ExecutionModeContext';
import {
    ArrowLeft, Play, Save, Download, Plus, X, Filter,
    Columns3, GitMerge, BarChart3, Sparkles, Settings,
    Eye, EyeOff, Type, Calendar, Copy, Trash2, FileText,
    Code, Table as TableIcon, Wand2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ColumnInfo {
    name: string;
    type: string;
    originalName: string;
    visible: boolean;
}

interface LoadedFile {
    filename: string;
    tableName: string;
    rowCount: number;
    columns: ColumnInfo[];
}

export default function DataTransformerPage() {
    const { filename } = useParams<{ filename: string }>();
    const navigate = useNavigate();
    const { executeQuery } = useDuckDBContext();
    const { token } = useAuth();
    const { isServerMode } = useExecutionMode();

    const [loadedFiles, setLoadedFiles] = useState<LoadedFile[]>([]);
    const [activeFile, setActiveFile] = useState<string>('');
    const [columns, setColumns] = useState<ColumnInfo[]>([]);
    const [data, setData] = useState<{ columns: string[]; rows: unknown[][] } | null>(null);
    const [loading, setLoading] = useState(false);
    const [showQueryEditor, setShowQueryEditor] = useState(false);
    const [sqlQuery, setSqlQuery] = useState('');

    // Dialog states
    const [showAddFile, setShowAddFile] = useState(false);
    const [showComputedField, setShowComputedField] = useState(false);
    const [showRelation, setShowRelation] = useState(false);
    const [showFilter, setShowFilter] = useState(false);
    const [showVisualization, setShowVisualization] = useState(false);
    const [showSaveTemplate, setShowSaveTemplate] = useState(false);
    const [showLoadTemplate, setShowLoadTemplate] = useState(false);
    const [showRenameColumn, setShowRenameColumn] = useState(false);
    const [showChangeType, setShowChangeType] = useState(false);
    const [showJoin, setShowJoin] = useState(false);
    const [showUnion, setShowUnion] = useState(false);

    // Form states
    const [newColumnName, setNewColumnName] = useState('');
    const [newColumnFormula, setNewColumnFormula] = useState('');
    const [filterColumn, setFilterColumn] = useState('');
    const [filterOperator, setFilterOperator] = useState('=');
    const [filterValue, setFilterValue] = useState('');
    const [templateName, setTemplateName] = useState('');
    const [templates, setTemplates] = useState<any[]>([]);
    const [availableFiles, setAvailableFiles] = useState<any[]>([]);

    // Column operation states
    const [selectedColumn, setSelectedColumn] = useState('');
    const [newName, setNewName] = useState('');
    const [newType, setNewType] = useState('VARCHAR');
    const [joinTable, setJoinTable] = useState('');
    const [joinColumn, setJoinColumn] = useState('');
    const [joinType, setJoinType] = useState('INNER');
    const [unionTable, setUnionTable] = useState('');

    useEffect(() => {
        if (filename) {
            loadInitialFile();
        }
        fetchAvailableFiles();
        fetchTemplates();
    }, [filename]);

    // Watch for active file changes and update columns/data
    useEffect(() => {
        if (!activeFile || loadedFiles.length === 0) return;

        const file = loadedFiles.find(f => f.tableName === activeFile);
        if (!file || !file.columns) return;

        // Restore columns for this file
        setColumns(file.columns);

        // Generate query
        const visibleCols = file.columns.filter(c => c.visible).map(c => c.name);
        const colList = visibleCols.length > 0 ? visibleCols.join(', ') : '*';
        const query = `SELECT ${colList} FROM ${activeFile} LIMIT 100`;
        setSqlQuery(query);

        // Load data
        const loadData = async () => {
            try {
                const result = await executeQuery(query);
                setData(result);
            } catch (err) {
                console.error('Failed to load data for active file:', err);
                toast.error('Failed to load file data');
            }
        };

        loadData();
    }, [activeFile]); // Only depend on activeFile, not loadedFiles

    const fetchAvailableFiles = async () => {
        if (!token) return;
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/storage/files?folder=uploads`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (response.ok) {
                const data = await response.json();
                setAvailableFiles(data.files || []);
            }
        } catch (err) {
            console.error('Failed to fetch files:', err);
        }
    };

    const fetchTemplates = async () => {
        if (!token) return;
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/workflows/templates`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (response.ok) {
                const data = await response.json();
                setTemplates(data);
            }
        } catch (err) {
            console.error('Failed to fetch templates:', err);
        }
    };

    const loadInitialFile = async () => {
        if (!filename) return;
        const decodedFilename = decodeURIComponent(filename);
        await loadFile(decodedFilename);
    };

    const loadFile = async (fileName: string) => {
        if (!token) return;

        setLoading(true);
        try {
            const table = fileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_');

            const response = await fetch(
                `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/storage/load-to-duckdb`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        filename: fileName,
                        table_name: table,
                        folder: 'uploads',
                    }),
                }
            );

            if (!response.ok) throw new Error('Failed to load file');

            const result = await response.json();

            const cols: ColumnInfo[] = result.columns.map((col: { name: string; type: string }) => ({
                name: col.name,
                type: col.type,
                originalName: col.name,
                visible: true
            }));

            setLoadedFiles(prev => [...prev, {
                filename: fileName,
                tableName: table,
                rowCount: result.rows,
                columns: cols
            }]);

            setActiveFile(table);
            setColumns(cols);

            // Generate and display initial query
            const initialQuery = `SELECT ${cols.map(c => c.name).join(', ')} FROM ${table} LIMIT 100`;
            setSqlQuery(initialQuery);
            setShowQueryEditor(true);

            await loadTableData(table);

            toast.success(`Loaded ${fileName}`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to load file');
        } finally {
            setLoading(false);
        }
    };

    const loadTableData = async (tableName: string) => {
        if (!tableName) return;

        try {
            // Get fresh columns if not available
            const currentColumns = columns.length > 0 ? columns :
                loadedFiles.find(f => f.tableName === tableName)?.columns || [];

            const visibleCols = currentColumns.filter(c => c.visible).map(c => c.name);
            const colList = visibleCols.length > 0 ? visibleCols.join(', ') : '*';
            const query = `SELECT ${colList} FROM ${tableName} LIMIT 100`;

            const result = await executeQuery(query);
            setData(result);
        } catch (err) {
            console.error('Failed to load table data:', err);
            toast.error('Failed to load table data');
        }
    };

    const updateQuery = () => {
        if (!activeFile) return;

        const visibleCols = columns.filter(c => c.visible).map(c => c.name);
        const colList = visibleCols.length > 0 ? visibleCols.join(', ') : '*';
        const query = `SELECT ${colList} FROM ${activeFile} LIMIT 100`;

        setSqlQuery(query);
        return query;
    };

    const removeFile = (tableName: string) => {
        setLoadedFiles(prev => prev.filter(f => f.tableName !== tableName));

        // If removing active file, switch to first remaining file
        if (tableName === activeFile) {
            const remaining = loadedFiles.filter(f => f.tableName !== tableName);
            if (remaining.length > 0) {
                setActiveFile(remaining[0].tableName);
                // Load columns and data for new active file
                const file = remaining[0];
                loadTableData(file.tableName);
            } else {
                setActiveFile('');
                setColumns([]);
                setData(null);
                setSqlQuery('');
            }
        }

        toast.success('File removed from transformation');
    };

    const handleAddComputedField = async () => {
        if (!newColumnName || !newColumnFormula) {
            toast.error('Please provide column name and formula');
            return;
        }

        try {
            const query = `SELECT *, ${newColumnFormula} AS ${newColumnName} FROM ${activeFile}`;
            const result = await executeQuery(query);
            setData(result);
            setColumns(prev => [...prev, {
                name: newColumnName,
                type: 'computed',
                originalName: newColumnName,
                visible: true
            }]);
            toast.success('Computed field added');
            setShowComputedField(false);
            setNewColumnName('');
            setNewColumnFormula('');
        } catch (err) {
            toast.error('Invalid formula');
        }
    };

    const handleApplyFilter = async () => {
        if (!filterColumn || !filterValue) {
            toast.error('Please provide filter details');
            return;
        }

        try {
            const query = `SELECT * FROM ${activeFile} WHERE ${filterColumn} ${filterOperator} '${filterValue}' LIMIT 100`;
            const result = await executeQuery(query);
            setData(result);
            toast.success('Filter applied');
            setShowFilter(false);
        } catch (err) {
            toast.error('Failed to apply filter');
        }
    };

    const handleRemoveDuplicates = async () => {
        try {
            const query = `SELECT DISTINCT * FROM ${activeFile}`;
            const result = await executeQuery(query);
            setData(result);
            toast.success('Duplicates removed');
        } catch (err) {
            toast.error('Failed to remove duplicates');
        }
    };

    const toggleColumnVisibility = async (colName: string) => {
        const updatedColumns = columns.map(c =>
            c.name === colName ? { ...c, visible: !c.visible } : c
        );
        setColumns(updatedColumns);

        // Update the columns in loadedFiles as well
        setLoadedFiles(prev => prev.map(f =>
            f.tableName === activeFile ? { ...f, columns: updatedColumns } : f
        ));

        // Generate and execute new query with only visible columns
        const visibleCols = updatedColumns.filter(c => c.visible).map(c => c.name);
        const colList = visibleCols.length > 0 ? visibleCols.join(', ') : '*';
        const query = `SELECT ${colList} FROM ${activeFile} LIMIT 100`;

        setSqlQuery(query);

        // Re-execute query to update preview
        try {
            const result = await executeQuery(query);
            setData(result);
        } catch (err) {
            toast.error('Failed to update data preview');
        }
    };

    const handleRenameColumn = async () => {
        if (!selectedColumn || !newName) {
            toast.error('Please provide column name and new name');
            return;
        }

        try {
            const columnList = columns.map(c =>
                c.name === selectedColumn ? `${c.name} AS ${newName}` : c.name
            ).join(', ');

            const query = `SELECT ${columnList} FROM ${activeFile}`;
            setSqlQuery(query);

            const result = await executeQuery(query);
            setData(result);

            // Update columns state
            setColumns(prev => prev.map(c =>
                c.name === selectedColumn ? { ...c, name: newName, originalName: c.name } : c
            ));

            toast.success('Column renamed');
            setShowRenameColumn(false);
            setSelectedColumn('');
            setNewName('');
        } catch (err) {
            toast.error('Failed to rename column');
        }
    };

    const handleChangeType = async () => {
        if (!selectedColumn || !newType) {
            toast.error('Please provide column and type');
            return;
        }

        try {
            const columnList = columns.map(c =>
                c.name === selectedColumn
                    ? `CAST(${c.name} AS ${newType}) as ${c.name}`
                    : c.name
            ).join(', ');

            const query = `SELECT ${columnList} FROM ${activeFile}`;
            setSqlQuery(query);

            const result = await executeQuery(query);
            setData(result);

            // Update columns state
            setColumns(prev => prev.map(c =>
                c.name === selectedColumn ? { ...c, type: newType } : c
            ));

            toast.success('Column type changed');
            setShowChangeType(false);
            setSelectedColumn('');
        } catch (err) {
            toast.error('Failed to change column type');
        }
    };

    const handleReorderColumn = (colName: string, direction: 'up' | 'down') => {
        const index = columns.findIndex(c => c.name === colName);
        if (index === -1) return;

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= columns.length) return;

        const newColumns = [...columns];
        [newColumns[index], newColumns[newIndex]] = [newColumns[newIndex], newColumns[index]];

        setColumns(newColumns);

        // Update loadedFiles
        setLoadedFiles(prev => prev.map(f =>
            f.tableName === activeFile ? { ...f, columns: newColumns } : f
        ));

        // Regenerate query
        const visibleCols = newColumns.filter(c => c.visible).map(c => c.name);
        const query = `SELECT ${visibleCols.join(', ')} FROM ${activeFile} LIMIT 100`;
        setSqlQuery(query);

        // Reload data
        executeQuery(query).then(setData);
    };

    const handleJoin = async () => {
        if (!joinTable || !joinColumn) {
            toast.error('Please provide join table and column');
            return;
        }

        try {
            const query = `
                SELECT t1.*, t2.*
                FROM ${activeFile} t1
                ${joinType} JOIN ${joinTable} t2 ON t1.${joinColumn} = t2.${joinColumn}
                LIMIT 100
            `;
            setSqlQuery(query);

            const result = await executeQuery(query);
            setData(result);

            toast.success('Join applied');
            setShowJoin(false);
        } catch (err) {
            toast.error('Failed to apply join');
        }
    };

    const handleUnion = async () => {
        if (!unionTable) {
            toast.error('Please select a table to union');
            return;
        }

        try {
            const query = `
                SELECT * FROM ${activeFile}
                UNION
                SELECT * FROM ${unionTable}
            `;
            setSqlQuery(query);

            const result = await executeQuery(query);
            setData(result);

            toast.success('Union applied');
            setShowUnion(false);
        } catch (err) {
            toast.error('Failed to apply union');
        }
    };

    const handleRunQuery = async () => {
        if (!sqlQuery) {
            toast.error('Please enter a SQL query');
            return;
        }

        try {
            const result = await executeQuery(sqlQuery);
            setData(result);
            toast.success('Query executed');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Query failed');
        }
    };

    const handleSaveTemplate = async () => {
        if (!templateName || !sqlQuery) {
            toast.error('Please provide template name and query');
            return;
        }

        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/workflows/templates`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        name: templateName,
                        description: 'Data transformation template',
                        query: sqlQuery
                    }),
                }
            );

            if (response.ok) {
                toast.success('Template saved');
                setShowSaveTemplate(false);
                setTemplateName('');
                fetchTemplates();
            }
        } catch (err) {
            toast.error('Failed to save template');
        }
    };

    const handleLoadTemplate = (template: any) => {
        setSqlQuery(template.query);
        setShowLoadTemplate(false);
        toast.success(`Loaded template: ${template.name}`);
    };

    const handleExport = () => {
        if (!data) return;

        const csv = [
            data.columns.join(','),
            ...data.rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${activeFile}_transformed.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast.success('Data exported!');
    };

    const handleSaveToStorage = async () => {
        if (!token) return;

        const filename = `${activeFile}_transformed_${new Date().getTime()}.csv`;

        try {
            if (isServerMode) {
                // Server Mode: Execute query and save to MinIO directly on backend
                const response = await fetch(
                    `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/storage/save-query-result`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            query: sqlQuery || `SELECT * FROM ${activeFile}`,
                            filename: filename,
                            folder: 'transformed'
                        }),
                    }
                );

                if (!response.ok) throw new Error('Failed to save to storage');
                toast.success('Saved to Transformed Files');
            } else {
                // WASM Mode: Upload client-side data
                if (!data) return;

                const csv = [
                    data.columns.join(','),
                    ...data.rows.map(row => row.join(','))
                ].join('\n');

                const blob = new Blob([csv], { type: 'text/csv' });
                const formData = new FormData();
                formData.append('file', blob, filename);
                formData.append('folder', 'transformed');

                const response = await fetch(
                    `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/storage/upload`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                        },
                        body: formData,
                    }
                );

                if (!response.ok) throw new Error('Failed to upload');
                toast.success('Saved to Transformed Files');
            }
        } catch (err) {
            toast.error('Failed to save file');
        }
    };

    return (
        <div className="h-full flex flex-col">
            {/* Top Bar */}
            <div className="border-b-2 border-border p-3 bg-secondary">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button onClick={() => navigate('/files')} variant="ghost" size="sm" className="gap-2">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <div>
                            <div>
                                <div>
                                    <h1 className="text-xl font-bold">Data Transformer</h1>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Editing: {activeFile} ({data?.rows.length || 0} rows) • {isServerMode ? 'Server Mode' : 'WASM Mode'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button onClick={() => setShowQueryEditor(!showQueryEditor)} size="sm" variant="outline" className="gap-2">
                            <Code className="w-4 h-4" />
                            {showQueryEditor ? 'Hide' : 'Show'} SQL
                        </Button>
                        <Button onClick={handleExport} size="sm" variant="outline" className="gap-2">
                            <Download className="w-4 h-4" />
                            Export
                        </Button>
                    </div>
                </div>
            </div>

            {/* SQL Query Editor */}
            {showQueryEditor && (
                <div className="border-b-2 border-border p-4 bg-secondary">
                    <Label className="text-sm font-medium mb-2 block">SQL Query Editor</Label>
                    <Textarea
                        value={sqlQuery}
                        onChange={(e) => setSqlQuery(e.target.value)}
                        placeholder="SELECT * FROM table_name WHERE..."
                        className="font-mono text-sm min-h-[100px] mb-2"
                    />
                    <div className="flex gap-2">
                        <Button onClick={handleRunQuery} size="sm" className="gap-2">
                            <Play className="w-3 h-3" />
                            Run Query
                        </Button>
                        <Button onClick={() => setShowSaveTemplate(true)} size="sm" variant="outline" className="gap-2">
                            <Save className="w-3 h-3" />
                            Save as Template
                        </Button>
                        <Button onClick={() => setShowLoadTemplate(true)} size="sm" variant="outline" className="gap-2">
                            <FileText className="w-3 h-3" />
                            Load Template
                        </Button>
                    </div>
                </div>
            )}

            {/* Toolbar */}
            <div className="border-b-2 border-border p-2 bg-secondary flex gap-2 overflow-x-auto">
                <Dialog open={showAddFile} onOpenChange={setShowAddFile}>
                    <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="gap-2">
                            <Plus className="w-4 h-4" />
                            Add File
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add File to Transformation</DialogTitle>
                            <DialogDescription>Select a file to add to your transformation</DialogDescription>
                        </DialogHeader>
                        <div className="max-h-[400px] overflow-y-auto">
                            {availableFiles
                                .filter(f => !loadedFiles.some(lf => lf.filename === f.name))
                                .map((file) => (
                                    <Button
                                        key={file.name}
                                        variant="outline"
                                        className="w-full justify-start mb-2"
                                        onClick={() => {
                                            loadFile(file.name);
                                            setShowAddFile(false);
                                        }}
                                    >
                                        {file.name}
                                    </Button>
                                ))}
                            {availableFiles.filter(f => !loadedFiles.some(lf => lf.filename === f.name)).length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    All available files are already loaded
                                </p>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>

                <Button onClick={handleSaveToStorage} size="sm" variant="outline" className="gap-2">
                    <Save className="w-4 h-4" />
                    Save to Storage
                </Button>
            </div>

            {/* Loaded Files Tabs */}
            {loadedFiles.length > 0 && (
                <div className="border-b-2 border-border bg-secondary p-2 flex gap-2 overflow-x-auto">
                    {loadedFiles.map((file) => (
                        <div
                            key={file.tableName}
                            className={cn(
                                "flex items-center gap-1 px-3 py-1.5 rounded-md border cursor-pointer text-sm transition-colors",
                                activeFile === file.tableName
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-background border-border hover:bg-muted"
                            )}
                        >
                            <span onClick={() => {
                                setActiveFile(file.tableName);
                                loadTableData(file.tableName);
                            }}>
                                {file.tableName} ({file.rowCount} rows)
                            </span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeFile(file.tableName);
                                }}
                                className="ml-1 hover:text-destructive"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex-1 flex overflow-hidden">
                {/* Main Content */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="border-b-2 border-border p-2 bg-secondary flex items-center justify-between">
                        <span className="text-sm font-medium">
                            {data?.rows.length || 0} rows × {columns.filter(c => c.visible).length} columns
                        </span>
                    </div>

                    <div className="flex-1 overflow-auto p-4">
                        {data && (
                            <div className="border-2 border-border">
                                <div className="overflow-auto max-h-full">
                                    <table className="w-full text-sm">
                                        <thead className="sticky top-0 bg-secondary z-10">
                                            <tr>
                                                <th className="border-r-2 border-b-2 border-border p-2 w-12">#</th>
                                                {columns.filter(c => c.visible).map((col, idx) => (
                                                    <th key={idx} className="border-r-2 border-b-2 border-border p-2 min-w-[150px]">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="font-bold truncate">{col.name}</span>
                                                            <div className="flex gap-1">
                                                                <Filter className="w-3 h-3 cursor-pointer hover:text-primary" />
                                                                <Type className="w-3 h-3 cursor-pointer hover:text-primary" />
                                                            </div>
                                                        </div>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.rows.map((row, rowIdx) => (
                                                <tr key={rowIdx} className="hover:bg-accent">
                                                    <td className="border-r-2 border-b border-border p-2 text-center text-xs text-muted-foreground bg-secondary/50">
                                                        {rowIdx + 1}
                                                    </td>
                                                    {(row as unknown[]).map((cell, cellIdx) => (
                                                        <td key={cellIdx} className="border-r border-b border-border p-2 font-mono text-xs">
                                                            {cell === null ? <span className="text-muted-foreground italic">NULL</span> : String(cell)}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Column Management Panel */}
                <div className="w-80 border-l-2 border-border overflow-y-auto p-4 bg-secondary">
                    <div className="space-y-4">
                        <h3 className="font-bold mb-4">Column Management</h3>

                        {/* Table Operations */}
                        <div className="space-y-2 pb-4 border-b border-border">
                            <p className="text-xs font-medium text-muted-foreground mb-2">TABLE OPERATIONS</p>
                            <Button
                                onClick={() => setShowJoin(true)}
                                size="sm"
                                variant="outline"
                                className="w-full justify-start gap-2"
                                disabled={loadedFiles.length < 2}
                            >
                                <GitMerge className="w-4 h-4" />
                                Join Tables
                            </Button>
                            <Button
                                onClick={() => setShowUnion(true)}
                                size="sm"
                                variant="outline"
                                className="w-full justify-start gap-2"
                                disabled={loadedFiles.length < 2}
                            >
                                <Columns3 className="w-4 h-4" />
                                Union Tables
                            </Button>
                        </div>

                        {/* Column List with Operations */}
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground mb-2">COLUMNS ({columns.length})</p>
                            {columns.map((col, index) => (
                                <div
                                    key={col.name}
                                    className="flex items-center gap-2 p-2 rounded-md hover:bg-muted group"
                                >
                                    <button
                                        onClick={() => toggleColumnVisibility(col.name)}
                                        className="shrink-0"
                                    >
                                        {col.visible ? (
                                            <Eye className="w-4 h-4" />
                                        ) : (
                                            <EyeOff className="w-4 h-4 opacity-50" />
                                        )}
                                    </button>

                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium truncate">{col.name}</div>
                                        <div className="text-xs text-muted-foreground">{col.type}</div>
                                    </div>

                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                                        <button
                                            onClick={() => handleReorderColumn(col.name, 'up')}
                                            disabled={index === 0}
                                            className="p-1 hover:bg-background rounded disabled:opacity-30"
                                            title="Move up"
                                        >
                                            <span className="text-xs">↑</span>
                                        </button>
                                        <button
                                            onClick={() => handleReorderColumn(col.name, 'down')}
                                            disabled={index === columns.length - 1}
                                            className="p-1 hover:bg-background rounded disabled:opacity-30"
                                            title="Move down"
                                        >
                                            <span className="text-xs">↓</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSelectedColumn(col.name);
                                                setShowRenameColumn(true);
                                            }}
                                            className="p-1 hover:bg-background rounded"
                                            title="Rename"
                                        >
                                            <Type className="w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSelectedColumn(col.name);
                                                setShowChangeType(true);
                                            }}
                                            className="p-1 hover:bg-background rounded"
                                            title="Change type"
                                        >
                                            <Settings className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Save Template Dialog */}
            <Dialog open={showSaveTemplate} onOpenChange={setShowSaveTemplate}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Save as Template</DialogTitle>
                        <DialogDescription>Save this transformation as a reusable template</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Template Name</Label>
                            <Input
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                placeholder="My Transformation"
                            />
                        </div>
                        <Button onClick={handleSaveTemplate} className="w-full">
                            Save Template
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Load Template Dialog */}
            <Dialog open={showLoadTemplate} onOpenChange={setShowLoadTemplate}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Load Template</DialogTitle>
                        <DialogDescription>Select a saved template to load</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 max-h-[400px] overflow-auto">
                        {templates.map((template) => (
                            <Button
                                key={template.id}
                                onClick={() => handleLoadTemplate(template)}
                                variant="outline"
                                className="w-full justify-start"
                            >
                                <div className="text-left">
                                    <p className="font-medium">{template.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">{template.query}</p>
                                </div>
                            </Button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Rename Column Dialog */}
            <Dialog open={showRenameColumn} onOpenChange={setShowRenameColumn}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename Column</DialogTitle>
                        <DialogDescription>Change the name of the selected column</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Current Name</Label>
                            <Input value={selectedColumn} disabled />
                        </div>
                        <div>
                            <Label>New Name</Label>
                            <Input
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Enter new column name"
                            />
                        </div>
                        <Button onClick={handleRenameColumn} className="w-full">
                            Rename Column
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Change Type Dialog */}
            <Dialog open={showChangeType} onOpenChange={setShowChangeType}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Change Column Type</DialogTitle>
                        <DialogDescription>Convert the column to a different data type</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Column</Label>
                            <Input value={selectedColumn} disabled />
                        </div>
                        <div>
                            <Label>New Type</Label>
                            <select
                                value={newType}
                                onChange={(e) => setNewType(e.target.value)}
                                className="w-full p-2 border rounded-md"
                            >
                                <option value="VARCHAR">VARCHAR (Text)</option>
                                <option value="INTEGER">INTEGER (Whole Number)</option>
                                <option value="DOUBLE">DOUBLE (Decimal Number)</option>
                                <option value="BOOLEAN">BOOLEAN (True/False)</option>
                                <option value="DATE">DATE</option>
                                <option value="TIMESTAMP">TIMESTAMP</option>
                            </select>
                        </div>
                        <Button onClick={handleChangeType} className="w-full">
                            Change Type
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Join Tables Dialog */}
            <Dialog open={showJoin} onOpenChange={setShowJoin}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Join Tables</DialogTitle>
                        <DialogDescription>Combine data from two tables based on a common column</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Join with Table</Label>
                            <select
                                value={joinTable}
                                onChange={(e) => setJoinTable(e.target.value)}
                                className="w-full p-2 border rounded-md"
                            >
                                <option value="">Select a table...</option>
                                {loadedFiles.filter(f => f.tableName !== activeFile).map(f => (
                                    <option key={f.tableName} value={f.tableName}>{f.tableName}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <Label>Join Column</Label>
                            <select
                                value={joinColumn}
                                onChange={(e) => setJoinColumn(e.target.value)}
                                className="w-full p-2 border rounded-md"
                            >
                                <option value="">Select a column...</option>
                                {columns.map(c => (
                                    <option key={c.name} value={c.name}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <Label>Join Type</Label>
                            <select
                                value={joinType}
                                onChange={(e) => setJoinType(e.target.value)}
                                className="w-full p-2 border rounded-md"
                            >
                                <option value="INNER">INNER JOIN</option>
                                <option value="LEFT">LEFT JOIN</option>
                                <option value="RIGHT">RIGHT JOIN</option>
                                <option value="FULL">FULL JOIN</option>
                            </select>
                        </div>
                        <Button onClick={handleJoin} className="w-full">
                            Apply Join
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Union Tables Dialog */}
            <Dialog open={showUnion} onOpenChange={setShowUnion}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Union Tables</DialogTitle>
                        <DialogDescription>Combine rows from two tables with the same structure</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Union with Table</Label>
                            <select
                                value={unionTable}
                                onChange={(e) => setUnionTable(e.target.value)}
                                className="w-full p-2 border rounded-md"
                            >
                                <option value="">Select a table...</option>
                                {loadedFiles.filter(f => f.tableName !== activeFile).map(f => (
                                    <option key={f.tableName} value={f.tableName}>{f.tableName}</option>
                                ))}
                            </select>
                        </div>
                        <Button onClick={handleUnion} className="w-full">
                            Apply Union
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
