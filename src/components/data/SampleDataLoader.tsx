import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Database, Download } from 'lucide-react';
import { useDuckDBContext } from '@/contexts/DuckDBContext';
import { toast } from 'sonner';

const SAMPLE_DATASETS = [
    {
        name: 'Sales Data',
        description: '1000 rows of sample sales transactions',
        tableName: 'sales',
        data: () => {
            const data = [];
            const products = ['Laptop', 'Phone', 'Tablet', 'Monitor', 'Keyboard', 'Mouse'];
            const regions = ['North', 'South', 'East', 'West'];

            for (let i = 1; i <= 1000; i++) {
                data.push({
                    id: i,
                    product: products[Math.floor(Math.random() * products.length)],
                    quantity: Math.floor(Math.random() * 10) + 1,
                    price: Math.floor(Math.random() * 1000) + 100,
                    region: regions[Math.floor(Math.random() * regions.length)],
                    sale_date: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0]
                });
            }
            return data;
        }
    },
    {
        name: 'Customer Data',
        description: '500 rows of customer information',
        tableName: 'customers',
        data: () => {
            const data = [];
            const firstNames = ['John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana'];
            const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia'];
            const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'];

            for (let i = 1; i <= 500; i++) {
                data.push({
                    customer_id: i,
                    first_name: firstNames[Math.floor(Math.random() * firstNames.length)],
                    last_name: lastNames[Math.floor(Math.random() * lastNames.length)],
                    email: `user${i}@example.com`,
                    city: cities[Math.floor(Math.random() * cities.length)],
                    signup_date: new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0]
                });
            }
            return data;
        }
    },
    {
        name: 'Product Inventory',
        description: '100 rows of product inventory',
        tableName: 'inventory',
        data: () => {
            const data = [];
            const categories = ['Electronics', 'Clothing', 'Food', 'Books', 'Toys'];

            for (let i = 1; i <= 100; i++) {
                data.push({
                    product_id: i,
                    product_name: `Product ${i}`,
                    category: categories[Math.floor(Math.random() * categories.length)],
                    stock_quantity: Math.floor(Math.random() * 500),
                    unit_price: Math.floor(Math.random() * 200) + 10,
                    last_updated: new Date().toISOString().split('T')[0]
                });
            }
            return data;
        }
    }
];

export function SampleDataLoader() {
    const { db } = useDuckDBContext();
    const [loading, setLoading] = useState<string | null>(null);

    const loadSampleData = async (dataset: typeof SAMPLE_DATASETS[0]) => {
        if (!db) {
            toast.error('DuckDB not initialized');
            return;
        }

        setLoading(dataset.tableName);
        try {
            const data = dataset.data();

            // Convert to CSV format
            const headers = Object.keys(data[0]);
            const csv = [
                headers.join(','),
                ...data.map(row => headers.map(h => row[h]).join(','))
            ].join('\n');

            // Register file and create table
            await db.registerFileText(`${dataset.tableName}.csv`, csv);
            const conn = await db.connect();
            await conn.query(`CREATE OR REPLACE TABLE ${dataset.tableName} AS SELECT * FROM read_csv_auto('${dataset.tableName}.csv')`);
            await conn.close();

            toast.success(`Loaded ${data.length} rows into table "${dataset.tableName}"`);
        } catch (err) {
            toast.error(`Failed to load sample data: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="border-2 border-border p-4">
            <div className="flex items-center gap-2 mb-4">
                <Database className="w-5 h-5" />
                <h3 className="font-bold text-sm uppercase tracking-wider">Sample Datasets</h3>
            </div>

            <div className="grid gap-3">
                {SAMPLE_DATASETS.map((dataset) => (
                    <div
                        key={dataset.tableName}
                        className="border-2 border-border p-3 flex items-center justify-between hover:bg-accent transition-colors"
                    >
                        <div>
                            <p className="font-bold text-sm">{dataset.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">{dataset.description}</p>
                            <p className="text-xs font-mono text-muted-foreground mt-1">Table: {dataset.tableName}</p>
                        </div>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => loadSampleData(dataset)}
                            disabled={loading === dataset.tableName}
                            className="gap-2"
                        >
                            <Download className="w-4 h-4" />
                            {loading === dataset.tableName ? 'Loading...' : 'Load'}
                        </Button>
                    </div>
                ))}
            </div>

            <div className="mt-4 p-3 bg-secondary/30 border-2 border-border">
                <p className="text-xs text-muted-foreground">
                    <strong>Tip:</strong> After loading sample data, try queries like:
                </p>
                <code className="text-xs font-mono block mt-2">
                    SELECT * FROM sales LIMIT 10;
                </code>
                <code className="text-xs font-mono block mt-1">
                    SELECT product, SUM(quantity * price) as revenue FROM sales GROUP BY product;
                </code>
            </div>
        </div>
    );
}
