/* eslint-disable */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Loader2, AlertCircle, CalendarIcon } from 'lucide-react';
import { supabase } from './createClient'; // Assuming you have Supabase setup
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

type Inspection = {
  inspection_id: number;
  picture_url: string;
  item_inspected: string;
  item_quantity: number;
  unit: string;
  expiry_date: string;
  request_amount: number;
  location: string;
  inspection_date: string;
  inspected_by: string;
  kit_condition: string;
  next_inspection_date: string;
  status: string;
  description: string;
};

const initialDummyData: Inspection[] = []; // Initial data is empty; will be fetched.

const users = ['John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Lee'];
const statuses = ['Passed', 'Needs Attention', 'Failed'];
const locations = ['Main Office', 'Workshop', 'Reception', 'Gym'];
const units = ['box', 'pack', 'roll', 'piece', 'pair'];

const InspectionService = {
  create: async (newInspection: Inspection) => {
    const { data, error } = await supabase.from('inspections').insert([newInspection]);
    if (error) throw error;
    return data;
  },
  getAll: async () => {
    const { data, error } = await supabase.from('inspections').select('*');
    if (error) throw error;
    return data;
  },
  update: async (inspectionId: number, updatedFields: Partial<Inspection>) => {
    const { data, error } = await supabase.from('inspections').update(updatedFields).eq('inspection_id', inspectionId);
    if (error) throw error;
    return data;
  },
  delete: async (inspectionId: number) => {
    const { data, error } = await supabase.from('inspections').delete().eq('inspection_id', inspectionId);
    if (error) throw error;
    return data;
  },
};

export default function FirstAidInspectionPreview() {
  const [inspections, setInspections] = useState<Inspection[]>(initialDummyData);
  const [filteredInspections, setFilteredInspections] = useState<Inspection[]>(initialDummyData);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Inspection | null>(null);
  const [editedItem, setEditedItem] = useState<Inspection | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [requestList, setRequestList] = useState<Inspection[]>([]);
  const [showRequestPopup, setShowRequestPopup] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const dialogContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsLoading(true);
    InspectionService.getAll()
      .then((data) => {
        setInspections(data);
        setFilteredInspections(data);
      })
      .catch((error) => console.error('Failed to fetch inspections:', error))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    setFilteredInspections(
      inspections.filter((inspection) =>
        Object.values(inspection).some((value) =>
          value && value.toString().toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    );
  }, [searchQuery, inspections]);

  const handleRequestAmountChange = (value: string, inspectionId: number) => {
    const updatedInspections = inspections.map((inspection) =>
      inspection.inspection_id === inspectionId ? { ...inspection, request_amount: parseInt(value) } : inspection
    );
    setInspections(updatedInspections);
  };

  const handleRowClick = (inspection: Inspection) => {
    setSelectedItem(inspection);
    setEditedItem(inspection);
    setHasChanges(false);
  };

  const handleInputChange = (name: string, value: string | number) => {
    setEditedItem((prev) => {
      if (!prev) return null;
      const updatedItem = { ...prev, [name]: value };
      setHasChanges(JSON.stringify(updatedItem) !== JSON.stringify(selectedItem));
      return updatedItem;
    });
  };

  const handleDateChange = (name: string, date: Date | undefined) => {
    if (date) {
      handleInputChange(name, format(date, 'yyyy-MM-dd'));
    }
  };

  const handleSave = async () => {
    if (editedItem) {
      setIsLoading(true);
      try {
        await InspectionService.update(editedItem.inspection_id, editedItem);
        setInspections((prevInspections) =>
          prevInspections.map((inspection) => (inspection.inspection_id === editedItem.inspection_id ? editedItem : inspection))
        );
        setSelectedItem(null);
        setEditedItem(null);
        setHasChanges(false);
        setWarningMessage('Changes saved successfully!');
      } catch (error) {
        console.error('Error updating inspection:', error);
        setWarningMessage('Error saving changes. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handlePreviewRequest = async () => {
    const requests = inspections.filter((inspection) => inspection.request_amount > 0);

    if (requests.length > 0) {
      try {
        setIsLoading(true);

        for (const item of requests) {
          const { error } = await supabase
            .from('inspections')
            .update({ request_amount: item.request_amount })
            .eq('inspection_id', item.inspection_id);
          if (error) throw error;
        }

        setRequestList(requests);
        setShowRequestPopup(true);
        setWarningMessage('');
      } catch (error) {
        console.error('Failed to update request amounts:', error);
        setWarningMessage('Failed to update request amounts. Please try again.');
      } finally {
        setIsLoading(false);
      }
    } else {
      setWarningMessage('Request list is empty. Please add items before previewing.');
      setShowRequestPopup(false);
    }
  };

  const handleSubmitRequest = async () => {
    setIsLoading(true);

    try {
      const { data: latestRequest, error: fetchError } = await supabase
        .from('inspections_request')
        .select('request_order_number')
        .order('request_order_number', { ascending: false })
        .limit(1);

      if (fetchError) throw fetchError;

      let nextRequestNumber = 1;
      if (latestRequest.length > 0 && latestRequest[0].request_order_number) {
        nextRequestNumber = parseInt(latestRequest[0].request_order_number) + 1;
      }

      const formattedRequestNumber = nextRequestNumber.toString().padStart(4, '0');

      const { data: requestData, error: requestError } = await supabase.from('inspections_request').insert(
        requestList.map((item) => ({
          inspection_id: item.inspection_id,
          request_order_number: formattedRequestNumber,
          request_amount: item.request_amount,
          picture_url: item.picture_url, // Include picture URL
          item_inspected: item.item_inspected, // Include inspected item name
          unit: item.unit, // Include unit
          description: item.description, // Include description
        }))
      );

      if (requestError) throw requestError;

      for (const item of requestList) {
        // Directly set `item_quantity` without calculating `updatedQuantity`
        const { error: updateError } = await supabase
          .from('inspections')
          .update({ item_quantity: item.item_quantity, request_amount: 0 }) // Reset request_amount to 0
          .eq('inspection_id', item.inspection_id);
        if (updateError) throw updateError;
      }

      // Refresh the page after the successful request
      window.location.reload();

      setInspections((prevInspections) =>
        prevInspections.map((inspection) => {
          const requestItem = requestList.find((item) => item.inspection_id === inspection.inspection_id);
          if (requestItem) {
            return {
              ...inspection,
              item_quantity: inspection.item_quantity, // Don't adjust item_quantity
              request_amount: 0,
            };
          }
          return inspection;
        })
      );

      console.log('Request successfully submitted:', requestData);
      setShowRequestPopup(false);
      setRequestList([]);
      setWarningMessage('Request submitted successfully and inventory updated!');
    } catch (error) {
      console.error('Failed to submit request or update inventory:', error);
      setWarningMessage('Failed to submit request or update inventory. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getExpiryDateStyle = useCallback((expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = differenceInDays(expiry, today);

    if (daysUntilExpiry < 0) return 'bg-red-500 text-white';
    if (daysUntilExpiry <= 90) return 'bg-orange-500 text-white';
    return 'bg-green-500 text-black';
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">First Aid Inspection List (Preview)</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Search Inspections</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            type="text"
            placeholder="Search across all columns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </CardContent>
      </Card>

      {warningMessage && (
        <Alert variant={warningMessage.includes('successfully') ? 'default' : 'destructive'} className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Notification</AlertTitle>
          <AlertDescription>{warningMessage}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end mb-6">
        <Button onClick={handlePreviewRequest}>Preview Request List</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">Item ID</TableHead>
                <TableHead>Picture</TableHead>
                <TableHead>Item Inspected</TableHead>
                <TableHead className="text-center">Item Quantity</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-center">Expiry Date</TableHead>
                <TableHead>Request Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInspections.length > 0 ? (
                filteredInspections.map((inspection) => (
                  <TableRow
                    key={inspection.inspection_id}
                    className="cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => handleRowClick(inspection)}
                  >
                    <TableCell className="text-center">{inspection.inspection_id}</TableCell>
                    <TableCell>
                      <img
                        src={inspection.picture_url}
                        alt={inspection.item_inspected}
                        className="w-12 h-12 object-cover rounded"
                      />
                    </TableCell>
                    <TableCell>{inspection.item_inspected}</TableCell>
                    <TableCell className="text-center">{inspection.item_quantity}</TableCell>
                    <TableCell>{inspection.unit}</TableCell>
                    <TableCell className={`${getExpiryDateStyle(inspection.expiry_date)} rounded-md px-2 py-1 text-center`}>
                      {inspection.expiry_date}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Select
                        onValueChange={(value) => handleRequestAmountChange(value, inspection.inspection_id)}
                        defaultValue={inspection.request_amount.toString()}
                      >
                        <SelectTrigger className="w-[100px]">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {[0, 1, 2, 3, 4, 5].map((amount) => (
                            <SelectItem key={amount} value={amount.toString()}>
                              {amount}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">No matching results found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={showRequestPopup} onOpenChange={setShowRequestPopup}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Request List Preview</DialogTitle>
            <DialogDescription>
              Review the items to be requested below.
            </DialogDescription>
          </DialogHeader>
          <div ref={dialogContentRef} className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
            {requestList.map((item, index) => (
              <div key={item.inspection_id}>
                <div className="grid grid-cols-3 items-center gap-4">
                  <Label htmlFor={`item-${item.inspection_id}`}>{item.item_inspected}</Label>
                  <Input
                    id={`item-${item.inspection_id}`}
                    value={item.request_amount}
                    className="col-span-1"
                    readOnly
                  />
                  <span>{item.unit}</span>
                  <div className="col-span-3">
                    <Label htmlFor={`description-${item.inspection_id}`}>Description</Label>
                    <Textarea
                      id={`description-${item.inspection_id}`}
                      value={item.description}
                      className="mt-1 resize-none bg-transparent"
                      readOnly
                    />
                  </div>
                  <div className="col-span-3 mt-2">
                    <img
                      src={item.picture_url}
                      alt={item.item_inspected}
                      className="w-full h-48 object-cover rounded"
                    />
                  </div>
                </div>
                {index < requestList.length - 1 && <Separator className="my-4" />}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={handleSubmitRequest} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedItem} onOpenChange={(open) => {
        if (!open) {
          setSelectedItem(null);
          setEditedItem(null);
          setHasChanges(false);
        }
      }}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Edit Inspection</DialogTitle>
            <DialogDescription>
              Make changes to the inspection details here. Click save when done.
            </DialogDescription>
          </DialogHeader>
          {editedItem && (
            <div className="grid gap-4 py-4">
              <div className="flex justify-center mb-4">
                <img
                  src={editedItem.picture_url}
                  alt={editedItem.item_inspected}
                  className="w-48 h-48 object-cover rounded"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="item_inspected">Item Inspected</Label>
                  <Input
                    id="item_inspected"
                    value={editedItem.item_inspected}
                    onChange={(e) => handleInputChange('item_inspected', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="item_quantity">Item Quantity</Label>
                  <Select
                    value={editedItem.item_quantity.toString()}
                    onValueChange={(value) => handleInputChange('item_quantity', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select quantity" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 10, 20, 30, 50].map((quantity) => (
                        <SelectItem key={quantity} value={quantity.toString()}>
                          {quantity}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Select
                    value={editedItem.unit}
                    onValueChange={(value) => handleInputChange('unit', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiry_date">Expiry Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !editedItem.expiry_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editedItem.expiry_date ? format(new Date(editedItem.expiry_date), "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={new Date(editedItem.expiry_date)}
                        onSelect={(date) => handleDateChange('expiry_date', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="next_inspection_date">Next Inspection Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !editedItem.next_inspection_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editedItem.next_inspection_date ? format(new Date(editedItem.next_inspection_date), "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={new Date(editedItem.next_inspection_date)}
                        onSelect={(date) => handleDateChange('next_inspection_date', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inspected_by">Inspected By</Label>
                  <Select
                    value={editedItem.inspected_by}
                    onValueChange={(value) => handleInputChange('inspected_by', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select inspector" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user} value={user}>
                          {user}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={editedItem.status}
                    onValueChange={(value) => handleInputChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Select
                    value={editedItem.location}
                    onValueChange={(value) => handleInputChange('location', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location} value={location}>
                          {location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={editedItem.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="resize-none"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            {hasChanges ? (
              <>
                <Button onClick={handleSave}>Save changes</Button>
                <Button variant="outline" onClick={() => {
                  setEditedItem(selectedItem);
                  setHasChanges(false);
                }}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button onClick={() => {
                setSelectedItem(null);
                setEditedItem(null);
              }}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
