const { db, admin } = require("../config/firebase");

const BLOG_COLLECTION = "blogs";

exports.createBlog = async (data) => {
  data.views = 0;
  data.createdAt = new Date();
  await db.collection(BLOG_COLLECTION).doc(data.slug).set(data);
};

exports.getAllBlogs = async () => {
  const snapshot = await db.collection(BLOG_COLLECTION).orderBy("createdAt", "desc").get();
  return snapshot.docs.map(doc => doc.data());
};

exports.getBlogBySlug = async (slug) => {
  const ref = db.collection(BLOG_COLLECTION).doc(slug);

  // Increment views
  await ref.update({ views: admin.firestore.FieldValue.increment(1) });

  const doc = await ref.get();
  return doc.data();
};

exports.updateBlog = async (slug, data) => {
  await db.collection(BLOG_COLLECTION).doc(slug).update(data);
};

exports.deleteBlog = async (slug) => {
  await db.collection(BLOG_COLLECTION).doc(slug).delete();
};
