import { queryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PackList } from './packing';
import type { Json } from '@/integrations/supabase/types';

export const listsOptions = queryOptions({
  queryKey: ['packing-lists'],
  queryFn: async (): Promise<PackList[]> => {
    const { data, error } = await supabase.from('packing_lists').select('id,data').order('created_at');
    if (error) throw error;
    return Promise.all(data.map(async (row) => {
      const list = { ...(row.data as unknown as PackList), id: row.id };
      if (list.photoPath) {
        const { data: photo } = await supabase.storage.from('list-photos').createSignedUrl(list.photoPath, 604800);
        list.photoUrl = photo?.signedUrl;
      }
      return list;
    }));
  },
});

export async function saveLists(lists: PackList[], removedIds: string[]) {
  if (lists.length) {
    const { error } = await supabase.from('packing_lists').upsert(lists.map(({ photoUrl: _url, ...list }) => ({ id: list.id, data: list as unknown as Json, updated_at: new Date().toISOString() })));
    if (error) throw error;
  }
  if (removedIds.length) {
    const { error } = await supabase.from('packing_lists').delete().in('id', removedIds);
    if (error) throw error;
  }
}

export async function uploadPhoto(file: File, listId: string) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Please sign in again to add a photo.');
  if (!file.type.startsWith('image/')) throw new Error('Please choose a photo.');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not read this photo.');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Could not save photo.')), 'image/jpeg', 0.85));
  const photoPath = `${user.id}/${listId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from('list-photos').upload(photoPath, blob, { contentType: 'image/jpeg' });
  if (error) throw error;
  const { data, error: urlError } = await supabase.storage.from('list-photos').createSignedUrl(photoPath, 604800);
  if (urlError) throw urlError;
  return { photoPath, photoUrl: data.signedUrl };
}