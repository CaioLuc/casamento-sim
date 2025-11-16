import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDhtzQdWZQ0VuqR2NQjYcm6IZe6f72LNGw",
  authDomain: "casamento-f6858.firebaseapp.com",
  projectId: "casamento-f6858",
  storageBucket: "casamento-f6858.firebasestorage.app",
  messagingSenderId: "541718982410",
  appId: "1:541718982410:web:9338432818a393040a54f3"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);