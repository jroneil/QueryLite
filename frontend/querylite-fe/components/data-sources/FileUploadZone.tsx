"use client";

import { useState, useCallback } from "react";
import { Upload, File, X, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authenticatedFetch } from "@/lib/api";
import { toast } from "sonner";

interface FileUploadZoneProps {
    onSuccess: () => void;
    onCancel: () => void;
}

export function FileUploadZone({ onSuccess, onCancel }: FileUploadZoneProps) {
    const [file, setFile] = useState<File | null>(null);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            const ext = droppedFile.name.split('.').pop()?.toLowerCase();
            if (['csv', 'xlsx', 'xls', 'parquet'].includes(ext || '')) {
                setFile(droppedFile);
                if (!name) setName(droppedFile.name.split('.')[0]);
            } else {
                toast.error("Unsupported file type. Please use CSV, Excel or Parquet.");
            }
        }
    }, [name]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            if (!name) setName(selectedFile.name.split('.')[0]);
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !name) return;

        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("name", name);
        if (description) formData.append("description", description);

        try {
            // Use authenticatedFetch for multi-part form data
            const authResponse = await authenticatedFetch("/api/local-files/upload", {
                method: "POST",
                body: formData,
            });

            if (authResponse.ok) {
                toast.success("File uploaded and registered successfully");
                onSuccess();
            } else {
                const err = await authResponse.json();
                toast.error(err.detail || "Upload failed");
            }
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Connection failed during upload");
        } finally {
            setUploading(false);
        }
    };

    return (
        <form onSubmit={handleUpload} className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">
                        Analysis Name
                    </Label>
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="E.g. Q4 Sales Report"
                        required
                        className="h-12 bg-slate-950/50 border-slate-800 text-white rounded-xl focus:ring-indigo-500/20 shadow-inner px-4 text-sm"
                    />
                </div>
                <div className="space-y-3">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">
                        Operational Brief
                    </Label>
                    <Input
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="E.g. Analyzing regional growth trends..."
                        className="h-12 bg-slate-950/50 border-slate-800 text-white rounded-xl focus:ring-indigo-500/20 shadow-inner px-4 text-sm"
                    />
                </div>
            </div>

            <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`relative group border-2 border-dashed rounded-[2rem] p-12 transition-all duration-300 flex flex-col items-center justify-center text-center
                    ${dragActive ? 'border-indigo-500 bg-indigo-500/10 scale-[0.99]' : 'border-slate-800 bg-slate-950/30 hover:border-slate-700'}
                    ${file ? 'border-emerald-500/40 bg-emerald-500/5' : ''}`}
            >
                <input
                    type="file"
                    onChange={handleFileChange}
                    accept=".csv,.xlsx,.xls,.parquet"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />

                {file ? (
                    <div className="space-y-4 animate-in zoom-in-95 duration-300">
                        <div className="h-20 w-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                        </div>
                        <div>
                            <p className="text-white font-bold text-lg">{file.name}</p>
                            <p className="text-slate-500 text-xs mt-1 uppercase tracking-widest font-bold">
                                {(file.size / 1024).toFixed(1)} KB Ready for Synthesis
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={(e) => { e.stopPropagation(); setFile(null); }}
                            className="text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl text-[10px] font-black uppercase tracking-widest"
                        >
                            <X className="h-3 w-3 mr-2" />
                            Remove File
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className="h-20 w-20 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-6 group-hover:border-indigo-500/50 group-hover:shadow-[0_0_30px_rgba(99,102,241,0.1)] transition-all">
                            <Upload className="h-8 w-8 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Drop local file here</h3>
                        <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed">
                            Drag & drop CSV, Excel, or Parquet files. We'll spin up a DuckDB instance instantly.
                        </p>
                    </>
                )}
            </div>

            <div className="flex gap-4 pt-4">
                <Button
                    type="submit"
                    disabled={uploading || !file}
                    className="h-12 px-8 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-600/20 transition-all border-t border-white/5"
                >
                    {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <>
                            <Upload className="mr-2 h-4 w-4" />
                            Initialize Synthesis
                        </>
                    )}
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    onClick={onCancel}
                    className="h-12 px-8 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl font-bold uppercase tracking-widest text-[10px]"
                >
                    Abort
                </Button>
            </div>
        </form>
    );
}
