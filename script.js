// --- Firebase 初始化 ---
const firebaseConfig = {
  apiKey: "AIzaSyARADNwXEJiAzB3BFEspZ5xn0qQLygCB1M",
  authDomain: "location-map-app-8459a.firebaseapp.com",
  databaseURL: "https://location-map-app-8459a-default-rtdb.firebaseio.com",
  projectId: "location-map-app-8459a",
  storageBucket: "location-map-app-8459a.appspot.com",
  messagingSenderId: "1044871421837",
  appId: "1:1044871421837:web:158aec3ce87909c58527c4",
  measurementId: "G-NP2SZHRVM4"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// --- 全域變數 ---
let map, markers = [], currentUid, mapType = google.maps.MapTypeId.ROADMAP;

// --- 啟動 App ---
function initApp() {
  // 1. Auth State 監聽
  auth.onAuthStateChanged(user => {
    if (user) {
      currentUid = user.uid;
      document.getElementById("btn-logout").hidden = false;
      loadTags();
      loadPlaces();
    } else {
      document.getElementById("btn-logout").hidden = true;
    }
  });

  // 2. 初始化地圖
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 25.033964, lng: 121.564472 },
    zoom: 13,
    mapTypeId: mapType
  });

  // 3. 綁定事件
  document.getElementById("btn-login-google").onclick = () =>
    auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
  document.getElementById("btn-logout").onclick = () => auth.signOut();
  document.getElementById("btn-geocode").onclick = geocode;
  document.getElementById("btn-add").onclick = addPlace;
  document.getElementById("btn-maptype").onclick = toggleMapType;
  document.getElementById("btn-locate").onclick = locateMe;
  document.getElementById("btn-export").onclick = exportJSON;
  document.getElementById("importFile").onchange = importJSON;
}

// --- 標籤列表 ---
async function loadTags() {
  const sel = document.getElementById("tagFilter");
  sel.innerHTML = "";
  const snap = await db
    .collection("users")
    .doc(currentUid)
    .collection("places")
    .get();
  const set = new Set();
  snap.forEach(doc => {
    (doc.data().tags || []).forEach(t => set.add(t));
  });
  set.forEach(t => {
    const o = new Option(t, t);
    sel.append(o);
  });
}

// --- 新增地點 ---
async function addPlace() {
  const name = document.getElementById("placeName").value.trim();
  const address = document.getElementById("address").value.trim();
  const notes = document.getElementById("notes").value.trim();
  const tags = document
    .getElementById("tags")
    .value.split(",")
    .map(s => s.trim())
    .filter(s => s);
  const file = document.getElementById("photo").files[0];
  if (!address) return alert("請輸入地址！");

  // Geocode
  const { r: results, s: status } = await new Promise(res =>
    new google.maps.Geocoder().geocode({ address }, (r, s) => res({ r, s }))
  );
  if (status !== "OK") return alert("地址錯誤：" + status);

  const loc = results[0].geometry.location;
  const data = {
    name: name || results[0].formatted_address,
    lat: loc.lat(),
    lng: loc.lng(),
    notes,
    tags,
    ts: Date.now()
  };

  // upload photo
  if (file) {
    const ref = storage.ref(
      `users/${currentUid}/photos/${Date.now()}_${file.name}`
    );
    await ref.put(file);
    data.photoUrl = await ref.getDownloadURL();
  }

  await db
    .collection("users")
    .doc(currentUid)
    .collection("places")
    .add(data);
}

// --- 讀取地點 & 清單 & 標記 ---
function loadPlaces() {
  // 移除舊標記與清單
  markers.forEach(m => m.setMap(null));
  markers = [];
  document.getElementById("placeList").innerHTML = "";

  // Query 篩選
  let q = db.collection("users").doc(currentUid).collection("places");
  const selTags = Array.from(
    document.getElementById("tagFilter").selectedOptions
  ).map(o => o.value);
  if (selTags.length) {
    q = q.where("tags", "array-contains-any", selTags);
  }

  // 監聽變化
  q.onSnapshot(snap => {
    // 清空再畫
    markers.forEach(m => m.setMap(null));
    markers = [];
    const list = document.getElementById("placeList");
    list.innerHTML = "";

    snap.forEach(doc => {
      const p = doc.data();
      const id = doc.id;

      // Marker
      const mk = new google.maps.Marker({
        map,
        position: { lat: p.lat, lng: p.lng },
        draggable: true,
        title: p.name
      });
      mk.addListener("dragend", e =>
        db
          .collection("users")
          .doc(currentUid)
          .collection("places")
          .doc(id)
          .update({ lat: e.latLng.lat(), lng: e.latLng.lng() })
      );
      mk.addListener("click", () =>
        new google.maps.InfoWindow({
          content: `<b>${p.name}</b><br>${(p.tags || []).join(
            ", "
          )}<br>${p.notes || ""}<br><img src="${
            p.photoUrl || ""
          }" style="max-width:100px">`
        }).open(map, mk)
      );
      markers.push(mk);

      // List
      const li = document.createElement("li");
      li.innerHTML = `<span>${p.name} (${p.lat.toFixed(5)},${p.lng.toFixed(
        5
      )})</span><button class="delete">❌</button>`;
      li.querySelector("span").onclick = () => {
        map.setCenter({ lat: p.lat, lng: p.lng });
        map.setZoom(17);
      };
      li.querySelector("button.delete").onclick = () =>
        db
          .collection("users")
          .doc(currentUid)
          .collection("places")
          .doc(id)
          .delete();
      list.append(li);
    });
  });
}

// --- 切換地圖類型 ---
function toggleMapType() {
  mapType =
    mapType === google.maps.MapTypeId.ROADMAP
      ? google.maps.MapTypeId.SATELLITE
      : google.maps.MapTypeId.ROADMAP;
  map.setMapTypeId(mapType);
}

// --- 定位使用者 ---
function locateMe() {
  navigator.geolocation.getCurrentPosition(p => {
    const pos = { lat: p.coords.latitude, lng: p.coords.longitude };
    map.setCenter(pos);
    map.setZoom(15);
  });
}

// --- 地址查詢 ---
function geocode() {
  const address = document.getElementById("address").value;
  new google.maps.Geocoder().geocode({ address }, (r, s) => {
    if (s === "OK") {
      map.setCenter(r[0].geometry.location);
      map.setZoom(17);
    } else {
      alert("查無地址：" + s);
    }
  });
}

// --- 匯出 JSON 檔案 ---
function exportJSON() {
  db.collection("users")
    .doc(currentUid)
    .collection("places")
    .get()
    .then(snap => {
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const blob = new Blob([JSON.stringify(arr)], {
        type: "application/json"
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "places.json";
      a.click();
    });
}

// --- 匯入 JSON 檔案 (修正版) ---
function importJSON(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    try {
      const arr = JSON.parse(evt.target.result);
      arr.forEach(obj => {
        delete obj.id;
        db
          .collection("users")
          .doc(currentUid)
          .collection("places")
          .add(obj);
      });
    } catch (err) {
      console.error("匯入 JSON 發生錯誤：", err);
      alert("JSON 格式不正確，無法匯入。");
    }
  };
  reader.readAsText(file);
}

// --- PWA Service Worker 註冊 ---
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/sw.js")
    .then(() => console.log("SW registered"))
    .catch(err => console.error("SW 註冊失敗：", err));
}
