// Firebase 콘솔에서 발급받은 실제 값을 아래에 넣어주세요.
// https://console.firebase.google.com/

export const firebaseConfig = {
  apiKey: "AIzaSyC5jLPIPojhzPwKScmWV7lR-BszTsSmbSA",
  authDomain: "todolist-495b5.firebaseapp.com",
  projectId: "todolist-495b5",
  storageBucket: "todolist-495b5.firebasestorage.app",
  messagingSenderId: "760312930576",
  appId: "1:760312930576:web:716c649f147c2c3e5fc595",
  measurementId: "G-94GDVJ4N71",
};

export function isFirebaseConfigValid(config) {
  return (
    config.apiKey && !config.apiKey.includes("YOUR_") &&
    config.authDomain && !config.authDomain.includes("YOUR_") &&
    config.projectId && !config.projectId.includes("YOUR_") &&
    config.storageBucket && !config.storageBucket.includes("YOUR_") &&
    config.messagingSenderId && !config.messagingSenderId.includes("YOUR_") &&
    config.appId && !config.appId.includes("YOUR_")
  );
}
