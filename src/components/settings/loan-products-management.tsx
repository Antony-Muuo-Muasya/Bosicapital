'use client';
import { useMemo, useState } from 'react';
import { useUserProfile } from '@/firebase';
import { getLoanProducts } from '@/actions/loan-products';
import { useEffect, useCallback } from 'react';
import { getLoanProductColumns } from './loan-product-columns';
import { Button } from '../ui/button';
import { PlusCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { AddLoanProductDialog } from './add-loan-product-dialog';
import { EditLoanProductDialog } from './edit-loan-product-dialog';


export function LoanProductsManagement() {
    const { userProfile, isLoading: isProfileLoading } = useUserProfile();
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<any | null>(null);

    const [products, setProducts] = useState<any[]>([]);
    const [areProductsLoading, setAreProductsLoading] = useState(true);

    const fetchProducts = useCallback(async () => {
        if (!userProfile) return;
        setAreProductsLoading(true);
        try {
            const res = await getLoanProducts(userProfile.organizationId);
            if (res.success && res.products) {
                setProducts(res.products);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setAreProductsLoading(false);
        }
    }, [userProfile]);

    useEffect(() => {
        if (!isProfileLoading && userProfile) {
            fetchProducts();
        }
    }, [isProfileLoading, userProfile, fetchProducts, isAddDialogOpen]);

    const isLoading = isProfileLoading || areProductsLoading;

    const handleEdit = (product: any) => {
        setEditingProduct(product);
    }
    
    const columns = useMemo(() => getLoanProductColumns(handleEdit, fetchProducts), [fetchProducts]);

    const table = useReactTable({
        data: products || [],
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

  return (
    <>
    <Card className="mt-4">
        <CardHeader>
            <div className='flex items-center justify-between'>
                <div>
                    <CardTitle>Loan Products</CardTitle>
                    <CardDescription>Manage the types of loans your organization offers.</CardDescription>
                </div>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Product
                </Button>
            </div>
        </CardHeader>
        <CardContent>
            <div className="rounded-md border">
                <Table>
                <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                        ))}
                    </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {isLoading && Array.from({length: 3}).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                            <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                        </TableRow>
                    ))}
                    {!isLoading && table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                        ))}
                    </TableRow>
                    ))}
                    {!isLoading && table.getRowModel().rows.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="h-24 text-center">
                                No loan products found.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
                </Table>
            </div>
        </CardContent>
    </Card>
    <AddLoanProductDialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open);
        if(!open) fetchProducts();
    }} />
    {editingProduct && (
        <EditLoanProductDialog 
            product={editingProduct}
            open={!!editingProduct}
            onOpenChange={(open) => {
                if (!open) {
                    setEditingProduct(null);
                    fetchProducts();
                }
            }}
        />
    )}
    </>
  );
}
