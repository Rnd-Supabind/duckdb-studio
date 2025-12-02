import { FileBrowser } from "@/components/data/FileBrowser";

export default function TransformedFilesPage() {
    return (
        <div className="h-full flex flex-col">
            <header className="border-b-2 border-border px-6 py-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Transformed Data</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        View and manage your transformed datasets
                    </p>
                </div>
            </header>

            <div className="flex-1 p-6 overflow-auto">
                <FileBrowser
                    folder="transformed"
                    title="Transformed Files"
                    description="Files created from data transformations"
                />
            </div>
        </div>
    )
}
