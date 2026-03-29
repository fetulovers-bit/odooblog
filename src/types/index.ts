// Define a User type
export type User = {
  id: string;
  username: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
};

// Define a Post type
export type Post = {
  id: string;
  title: string;
  content: string;
  author: User;
  createdAt: Date;
  updatedAt: Date;
  likes: number;
  comments: Comment[];
};

// Define a Comment type
export type Comment = {
  id: string;
  content: string;
  post: Post;
  author: User;
  createdAt: Date;
};

// Define a Like type
export type Like = {
  id: string;
  user: User;
  post: Post;
  createdAt: Date;
};