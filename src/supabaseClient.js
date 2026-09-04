import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ffgycumfccwcywyammzj.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmZ3ljdW1mY2N3Y3l3eWFtbXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1MjE4NTUsImV4cCI6MjEwNDA5Nzg1NX0.4QecPesjUcQaGXg7yBGqa1_ONIwPNbQWmsue9Spdrwc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
