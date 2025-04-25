// === Firebase 初始化 ===
const firebaseConfig = {
    apiKey: "AIzaSyARADNwXEJiAzB3BFEspZ5xn0qQLygCB1M",
    authDomain: "location-map-app-8459a.firebaseapp.com",
    databaseURL: "https://location-map-app-8459a-default-rtdb.firebaseio.com",
    projectId: "location-map-app-8459a",
    storageBucket: "location-map-app-8459a.firebasestorage.app",
    messagingSenderId: "1044871421837",
    appId: "1:1044871421837:web:158aec3ce87909c58527c4"
  };
  
  firebase.initializeApp(firebaseConfig);
  const db = firebase.database();
  
  let map;
  let markers = {};
  
  function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
      center: { lat: 25.033964, lng: 121.564472 },
      zoom: 13,
    });
  
    // 監聽 Firebase 中的資料變化
    db.ref("places").on("value", snapshot => {
      const data = snapshot.val() || {};
      clearMarkers();
      document.getElementById("placeList").innerHTML = "";
  
      Object.entries(data).forEach(([key, p]) => {
        addMarkerToMap(p.name, p.lat, p.lng, key);
        addPlaceToList(p.name, p.lat, p.lng, key);
      });
    });
  }
  
  // 查地址
  function geocode() {
    const address = document.getElementById("address").value;
    if (!address) return;
  
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: address }, (results, status) => {
      if (status === "OK") {
        const loc = results[0].geometry.location;
        map.setCenter(loc);
        map.setZoom(17);
      } else {
        alert("查詢失敗：" + status);
      }
    });
  }
  
  // 加入地點
  function addPlace() {
    let name = document.getElementById("placeName").value.trim();
    const address = document.getElementById("address").value.trim();
  
    if (!address) {
      alert("請輸入地址！");
      return;
    }
  
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address }, (results, status) => {
      if (status === "OK") {
        const loc = results[0].geometry.location;
        const lat = loc.lat();
        const lng = loc.lng();
        if (!name) name = results[0].formatted_address;
  
        const newPlace = { name, lat, lng };
        db.ref("places").push(newPlace);
        document.getElementById("placeName").value = "";
        document.getElementById("address").value = "";
      } else {
        alert("找不到地址：" + status);
      }
    });
  }
  
  // 加入地圖
  function addMarkerToMap(name, lat, lng, key) {
    const marker = new google.maps.Marker({
      map,
      position: { lat, lng },
      title: name,
    });
  
    const info = new google.maps.InfoWindow({
      content: `<b>${name}</b><br>Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`
    });
  
    marker.addListener("click", () => info.open(map, marker));
    markers[key] = marker;
  }
  
  // 移除所有地圖標記
  function clearMarkers() {
    for (const key in markers) {
      markers[key].setMap(null);
    }
    markers = {};
  }
  
  // 加入清單
  function addPlaceToList(name, lat, lng, key) {
    const li = document.createElement("li");
  
    const span = document.createElement("span");
    span.textContent = `${name} (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
    span.style.cursor = "pointer";
    span.onclick = () => {
      map.setCenter({ lat, lng });
      map.setZoom(17);
    };
  
    const delBtn = document.createElement("button");
    delBtn.textContent = "❌";
    delBtn.className = "delete";
    delBtn.onclick = () => db.ref("places/" + key).remove();
  
    li.appendChild(span);
    li.appendChild(delBtn);
    document.getElementById("placeList").appendChild(li);
  }
  