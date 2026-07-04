'use client';

import { useState, useTransition, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'sonner';
import {
  Loader2,
  Send,
  Users,
  Scissors,
  Layers,
  Plus,
  Trash2,
  AlertTriangle,
  X,
  Code,
  ListPlus,
  ImagePlus
} from 'lucide-react';

import { FormInput, FormTextarea, FormSelect } from '@/components/forms';
import { notificationFormSchema } from '@/lib/schemas/notification.schema';
import {
  handleConfirmNotificationImageUploadAction,
  handleCreateNotificationAction,
  handleRequestNotificationImageUploadAction,
} from '../_actions/notification.action';
import { cn } from '@/lib/utils/cn';

const allowedNotificationImageTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);

const audienceCards = [
  {
    mode: 'customers',
    title: 'Customers',
    description: 'Salon booking clients',
    info: 'Targets active mobile customers',
    icon: Users,
  },
  {
    mode: 'barbers',
    title: 'Barbers',
    description: 'Styling professionals',
    info: 'Targets service providers & staff',
    icon: Scissors,
  },
  {
    mode: 'customers_and_barbers',
    title: 'Both Groups',
    description: 'Entire EverCut base',
    info: 'Targets all platform users',
    icon: Layers,
  },
];

const uploadNotificationImage = async (file) => {
  const upload = await handleRequestNotificationImageUploadAction({
    contentType: file.type,
    sizeBytes: file.size,
  });

  if (!upload.success) {
    throw new Error(upload.message || 'Unable to create image upload.');
  }

  const response = await fetch(upload.data.uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error('Image upload failed.');
  }

  const confirmed = await handleConfirmNotificationImageUploadAction(upload.data.mediaId);
  if (!confirmed.success) {
    throw new Error(confirmed.message || 'Unable to confirm image upload.');
  }

  return {
    mediaId: upload.data.mediaId,
    media: confirmed.data,
  };
};

export function NotificationForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [payloadTab, setPayloadTab] = useState('structured');
  const [kvPairs, setKvPairs] = useState([{ key: '', value: '' }]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [validatedValues, setValidatedValues] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [imageUploadError, setImageUploadError] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(notificationFormSchema),
    defaultValues: {
      title: '',
      body: '',
      type: 'hybrid',
      category: 'admin_broadcast',
      audienceMode: 'customers',
      imageMediaId: null,
      dataJson: '{}',
    },
  });

  const [watchTitle, watchBody, watchCategory, watchAudience, watchDataJson] = useWatch({
    control,
    name: ['title', 'body', 'category', 'audienceMode', 'dataJson'],
  });
  const isSubmitting = isPending || isUploadingImage;

  useEffect(() => () => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
  }, [imagePreviewUrl]);

  const handleImageChange = (event) => {
    const file = event.target.files?.[0] || null;
    setImageUploadError(null);

    if (!file) return;

    if (!allowedNotificationImageTypes.has(file.type)) {
      setImageUploadError('Select a PNG, JPEG, or WebP image.');
      event.target.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setImageUploadError('Image must be 10 MB or smaller.');
      event.target.value = '';
      return;
    }

    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    setValue('imageMediaId', null, { shouldValidate: true });
  };

  const clearImage = () => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImageFile(null);
    setImagePreviewUrl(null);
    setImageUploadError(null);
    setValue('imageMediaId', null, { shouldValidate: true });
  };

  // Sync structured state back to dataJson hidden form state
  const updatePayloadField = (updatedPairs) => {
    const obj = {};
    updatedPairs.forEach(({ key, value }) => {
      const trimmedKey = key.trim();
      if (trimmedKey) {
        let parsedVal = value;
        if (value === 'true') parsedVal = true;
        else if (value === 'false') parsedVal = false;
        else if (!isNaN(value) && value.trim() !== '') parsedVal = Number(value);
        else {
          try {
            if ((value.startsWith('{') && value.endsWith('}')) || (value.startsWith('[') && value.endsWith(']'))) {
              parsedVal = JSON.parse(value);
            }
          } catch (_) {
            // Treat as raw string
          }
        }
        obj[trimmedKey] = parsedVal;
      }
    });
    setValue('dataJson', JSON.stringify(obj), { shouldValidate: true });
  };

  const handleKvChange = (index, field, value) => {
    const updated = [...kvPairs];
    updated[index][field] = value;
    setKvPairs(updated);
    updatePayloadField(updated);
  };

  const addKvPair = () => {
    const updated = [...kvPairs, { key: '', value: '' }];
    setKvPairs(updated);
  };

  const removeKvPair = (index) => {
    const updated = kvPairs.filter((_, i) => i !== index);
    const finalPairs = updated.length > 0 ? updated : [{ key: '', value: '' }];
    setKvPairs(finalPairs);
    updatePayloadField(finalPairs);
  };

  const handleTabChange = (newTab) => {
    if (newTab === 'structured') {
      try {
        const parsed = JSON.parse(watchDataJson || '{}');
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const pairs = Object.entries(parsed).map(([key, val]) => ({
            key,
            value: typeof val === 'object' ? JSON.stringify(val) : String(val),
          }));
          setKvPairs(pairs.length > 0 ? pairs : [{ key: '', value: '' }]);
        }
      } catch (e) {
        // Fallback or ignore if invalid JSON in raw mode
      }
    }
    setPayloadTab(newTab);
  };

  // Intermediate step to open safety confirmation dialog
  const onPreSubmit = (values) => {
    setValidatedValues(values);
    setShowConfirmModal(true);
  };

  // Final submission executing the server action
  const onFinalSubmit = () => {
    setShowConfirmModal(false);
    if (!validatedValues) return;

    startTransition(async () => {
      let imageMediaId = validatedValues.imageMediaId || null;

      if (imageFile && !imageMediaId) {
        try {
          setIsUploadingImage(true);
          const upload = await uploadNotificationImage(imageFile);
          imageMediaId = upload.mediaId;
          setValue('imageMediaId', imageMediaId, { shouldValidate: true });
        } catch (error) {
          toast.error(error.message || 'Unable to upload notification image.');
          setImageUploadError(error.message || 'Unable to upload notification image.');
          setIsUploadingImage(false);
          return;
        } finally {
          setIsUploadingImage(false);
        }
      }

      const result = await handleCreateNotificationAction({
        ...validatedValues,
        imageMediaId,
      });

      if (!result.success) {
        if (result.errors?.length) {
          result.errors.forEach(({ field, message }) => {
            let formField = field;
            if (field === 'audience.mode' || field === 'audience') {
              formField = 'audienceMode';
            } else if (field === 'data' || String(field).startsWith('data.')) {
              formField = 'dataJson';
            }
            setError(formField, { type: 'server', message });
          });
        }
        toast.error(result.message || 'Unable to send notification.');
        return;
      }

      toast.success('Broadcast created. Dispatch is in progress.');
      router.push(`/notifications/${result.data.id}`);
      router.refresh();
    });
  };

  const getCategoryLabel = (cat) => {
    return {
      admin_broadcast: 'Admin Broadcast',
      system_alert: 'System Alert',
      transactional: 'Transactional',
      silent_sync: 'Silent Sync',
      promotional: 'Promotional',
    }[cat] || 'Notification';
  };

  return (
    <>
      <form onSubmit={handleSubmit(onPreSubmit)} className="space-y-6" noValidate>
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-1">Alert Configuration</h2>
            <p className="text-xs text-muted-foreground">Draft the main contents and headers of your notification.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormInput
              label="Notification Title"
              required
              placeholder="E.g., Special Weekend Booking Discounts"
              error={errors.title?.message}
              {...register('title')}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormSelect
                label="Type"
                options={[
                  { value: 'hybrid', label: 'Hybrid (Push + Feed)' },
                  { value: 'push', label: 'Push Only' },
                  { value: 'silent', label: 'Silent Sync' },
                ]}
                error={errors.type?.message}
                {...register('type')}
              />
              <FormSelect
                label="Category"
                options={[
                  { value: 'admin_broadcast', label: 'Admin broadcast' },
                  { value: 'system_alert', label: 'System alert' },
                  { value: 'transactional', label: 'Transactional' },
                  { value: 'silent_sync', label: 'Silent sync' },
                  { value: 'promotional', label: 'Promotional' },
                ]}
                error={errors.category?.message}
                {...register('category')}
              />
            </div>
          </div>

          <FormTextarea
            label="Notification Message Body"
            required
            rows={3}
            maxLength={500}
            placeholder="E.g., Get 15% off on your next haircut using coupon EVERCUT15. Valid until Sunday!"
            error={errors.body?.message}
            {...register('body')}
          />

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-semibold text-foreground/80">Notification Image</h3>
              </div>
              {imagePreviewUrl && (
                <button
                  type="button"
                  onClick={clearImage}
                  className="inline-flex h-8 items-center gap-1.5 rounded border border-border px-2.5 text-xs font-semibold text-foreground hover:bg-muted"
                >
                  <X className="h-3.5 w-3.5" />
                  Remove
                </button>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
              <div className="flex aspect-[16/9] items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
                {imagePreviewUrl ? (
                  <Image
                    src={imagePreviewUrl}
                    alt=""
                    width={320}
                    height={180}
                    unoptimized
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImagePlus className="h-7 w-7 text-muted-foreground" />
                )}
              </div>
              <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-background px-4 py-3 text-center hover:bg-muted/50">
                <ImagePlus className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs font-semibold text-foreground">Upload Image</span>
                <span className="text-[11px] text-muted-foreground">PNG, JPEG, or WebP up to 10 MB</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleImageChange}
                  className="sr-only"
                />
              </label>
            </div>
            {imageUploadError && (
              <p className="text-xs font-medium text-destructive" role="alert">
                {imageUploadError}
              </p>
            )}
          </div>
        </div>

        {/* Audience Selector Card */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-1">Target Audience</h2>
            <p className="text-xs text-muted-foreground">Select the segment of platform users to broadcast this notification to.</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {audienceCards.map((card) => {
              const isSelected = watchAudience === card.mode;
              const Icon = card.icon;

              return (
                <button
                  key={card.mode}
                  type="button"
                  onClick={() => setValue('audienceMode', card.mode, { shouldValidate: true })}
                  className={cn(
                    'flex flex-col text-left p-4 rounded-lg border transition-all duration-200 cursor-pointer focus:outline-none select-none',
                    isSelected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border bg-card hover:bg-muted/50'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn('p-1.5 rounded border', isSelected ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-muted border-border text-muted-foreground')}>
                      <Icon className="h-4 w-4" />
                    </span>
                    {isSelected && <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
                  </div>
                  <span className="text-sm font-semibold text-foreground mb-0.5">{card.title}</span>
                  <span className="text-xs text-muted-foreground leading-tight mb-2">{card.description}</span>
                  <span className="text-[10px] text-muted-foreground/80 mt-auto pt-1 border-t border-border/60">{card.info}</span>
                </button>
              );
            })}
          </div>
          {errors.audienceMode && (
            <p className="text-xs text-destructive font-medium" role="alert">
              {errors.audienceMode.message}
            </p>
          )}
        </div>

        {/* Tabbed Payload Editor */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-0.5">Custom Metadata Parameters</h2>
              <p className="text-xs text-muted-foreground">Add key-value fields for deep links, routes, or custom codes.</p>
            </div>

            <div className="flex rounded-md bg-muted p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => handleTabChange('structured')}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 rounded-sm transition-colors',
                  payloadTab === 'structured' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <ListPlus className="h-3 w-3" />
                Structured
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('raw')}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 rounded-sm transition-colors',
                  payloadTab === 'raw' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Code className="h-3 w-3" />
                Raw JSON
              </button>
            </div>
          </div>

          {payloadTab === 'structured' ? (
            <div className="space-y-3">
              {kvPairs.map((pair, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <div className="grid grid-cols-2 gap-2 flex-1">
                    <FormInput
                      placeholder="Key (e.g. route)"
                      value={pair.key}
                      onChange={(e) => handleKvChange(index, 'key', e.target.value)}
                      wrapperClassName="w-full"
                      className="h-8.5 py-1 text-xs"
                    />
                    <FormInput
                      placeholder="Value (e.g. /barbers)"
                      value={pair.value}
                      onChange={(e) => handleKvChange(index, 'value', e.target.value)}
                      wrapperClassName="w-full"
                      className="h-8.5 py-1 text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeKvPair(index)}
                    className="p-2 rounded border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
                    aria-label="Remove parameter"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addKvPair}
                className="inline-flex h-8 items-center gap-1.5 rounded border border-dashed border-border px-3 text-xs font-semibold text-foreground hover:bg-muted"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Parameter
              </button>
            </div>
          ) : (
            <FormTextarea
              label="JSON Data Payload String"
              rows={5}
              className="font-mono text-xs"
              error={errors.dataJson?.message}
              {...register('dataJson')}
            />
          )}
        </div>

        {/* Submit Action */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 select-none cursor-pointer"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send Broadcast
          </button>
        </div>
      </form>

      {/* Safety Confirmation Dialog Overlay */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl p-6 max-w-md w-full space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground">Confirm Broadcast Dispatch</h3>
                <p className="text-xs text-muted-foreground">You are about to create a platform-wide broadcast. The system will dispatch it in the background. Please verify the following information:</p>
              </div>
            </div>

            <div className="rounded-md bg-muted/65 p-3.5 space-y-2.5 text-xs">
              <div className="grid grid-cols-3 gap-1 border-b border-border/40 pb-2">
                <span className="font-semibold text-muted-foreground">Audience:</span>
                <span className="col-span-2 text-foreground font-medium capitalize">{watchAudience.replaceAll('_', ' ')}</span>
              </div>
              <div className="grid grid-cols-3 gap-1 border-b border-border/40 pb-2">
                <span className="font-semibold text-muted-foreground">Category:</span>
                <span className="col-span-2 text-foreground font-medium">{getCategoryLabel(watchCategory)}</span>
              </div>
              <div className="space-y-1">
                <span className="font-semibold text-muted-foreground">Title:</span>
                <p className="text-foreground font-semibold bg-card px-2.5 py-1.5 rounded border border-border/40">{watchTitle}</p>
              </div>
              <div className="space-y-1">
                <span className="font-semibold text-muted-foreground">Body message:</span>
                <p className="text-foreground bg-card px-2.5 py-1.5 rounded border border-border/40 max-h-24 overflow-y-auto leading-relaxed">{watchBody}</p>
              </div>
              {imagePreviewUrl && (
                <div className="space-y-1">
                  <span className="font-semibold text-muted-foreground">Image:</span>
                  <div className="overflow-hidden rounded border border-border/40 bg-card">
                    <Image
                      src={imagePreviewUrl}
                      alt=""
                      width={448}
                      height={112}
                      unoptimized
                      className="h-28 w-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 border-l-2 border-destructive bg-destructive/5 p-3 text-[11px] text-destructive">
              <span><strong>Information:</strong> This broadcast will be created and dispatched to all registered devices in the background. This action cannot be undone.</span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="inline-flex h-9 items-center rounded border border-border bg-card px-3 text-xs font-semibold text-foreground hover:bg-muted cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onFinalSubmit}
                disabled={isSubmitting}
                className="inline-flex h-9 items-center gap-1.5 rounded bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Confirm & Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default NotificationForm;
