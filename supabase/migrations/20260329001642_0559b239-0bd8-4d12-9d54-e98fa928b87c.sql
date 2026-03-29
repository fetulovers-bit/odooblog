
INSERT INTO storage.buckets (id, name, public) VALUES ('blog-images', 'blog-images', true);

CREATE POLICY "Anyone can read blog images" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'blog-images');

CREATE POLICY "Anyone can upload blog images" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'blog-images');
