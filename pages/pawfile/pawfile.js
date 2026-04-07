// pages/pawfile/pawfile.js
const app = getApp();
const storage = require('../../utils/storage');
const { t, getLanguage } = require('../../utils/i18n');

Page({
  data: {
    pets: [],
    isAdding: false,
    editingPetId: null,
    name: '',
    species: 'cat',
    breed: '',
    birthday: '',
    initialWeight: '',
    avatar: null,
    speciesList: ['cat', 'dog', 'other'],
    catBreeds: [],
    dogBreeds: [],
    filteredBreeds: [],
    showBreedModal: false,
    breedSearchQuery: '',
    showBirthdayModal: false,
    dateValues: [0, 0, 0], // Index of [year, month, day]
    years: [],
    months: [],
    days: [],
    i18n: {}
  },

  onLoad() {
    this.setData({
      i18n: {
        add_pet: t('add_pet'), edit_pet: t('edit_pet'), name: t('name'),
        breed_optional: t('breed_optional'), birthday_optional: t('birthday_optional'),
        weight_kg: t('weight_kg'), photo: t('photo'), photo_url: t('photo_url'),
        save: t('save'), cancel: t('cancel'), species: t('species'),
        cat: t('cat'), dog: t('dog'), other: t('other'),
        who_caring: t('who_caring'), delete_confirm: t('delete_confirm'),
        search_breed: t('search_breed'), customize: t('customize'), no_results: t('no_results'),
        take_photo: t('take_photo'), choose_from_album: t('choose_from_album')
      }
    });

    // Load cat breeds
    try {
      this.setData({ catBreeds: require('../../static/catbreed.js') });
    } catch (e) {
      console.error('Failed to load cat breeds', e);
    }
    
    // Load dog breeds
    try {
      this.setData({ dogBreeds: require('../../static/dogbreed.js') });
    } catch (e) {
      console.error('Failed to load dog breeds', e);
    }

    // Initialize Date Arrays for Birthday Modal
    const date = new Date();
    const curYear = date.getFullYear();
    const years = [];
    const months = [];
    const days = [];
    for (let i = curYear - 30; i <= curYear; i++) years.push(i);
    for (let i = 1; i <= 12; i++) months.push(i);
    for (let i = 1; i <= 31; i++) days.push(i);
    
    this.setData({ 
      years, months, days,
      dateValues: [years.length - 1, date.getMonth(), date.getDate() - 1]
    });

    this.refreshData();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
      this.getTabBar().updateLang();
    }
    wx.setNavigationBarTitle({ title: t('pawfile') || 'Pawfile' });
    setTimeout(() => this.refreshData(), 0);
  },

  refreshData() {
    const state = app.getState();
    this.setData({ pets: state.pets });
  },

  selectPet(e) {
    const id = e.currentTarget.dataset.id;
    let state = app.getState();
    state = storage.setActivePetId(state, id);
    app.setState(state);
    wx.switchTab({ url: '/pages/dashboard/dashboard' });
  },

  startAdding() {
    this.setData({ isAdding: true });
  },

  resetForm() {
    this.setData({
      isAdding: false, editingPetId: null,
      name: '', species: 'cat', breed: '', birthday: '', initialWeight: '', avatar: null
    });
  },

  setSpecies(e) {
    const species = e.currentTarget.dataset.species;
    this.setData({ 
      species: species,
      breed: '' // Reset breed when species changes to avoid cat breeds on dogs
    });
  },

  onNameInput(e) { this.setData({ name: e.detail.value }); },
  
  onBreedInput(e) { 
    if (this.data.species === 'cat') {
      this.openBreedModal();
    } else {
      this.setData({ breed: e.detail.value }); 
    }
  },

  openBreedModal() {
    const breeds = this.data.species === 'cat' ? this.data.catBreeds : 
                   (this.data.species === 'dog' ? this.data.dogBreeds : []);
    this.setData({ 
      showBreedModal: true, 
      breedSearchQuery: '',
      filteredBreeds: breeds
    });
  },

  closeBreedModal() {
    this.setData({ showBreedModal: false });
  },

  onBreedSearch(e) {
    const rawValue = (e.detail.value || '').trim();
    const query = rawValue.toLowerCase();
    const currentBreeds = this.data.species === 'cat' ? this.data.catBreeds : 
                          (this.data.species === 'dog' ? this.data.dogBreeds : []);

    if (!query) {
      this.setData({ breedSearchQuery: '', filteredBreeds: currentBreeds });
      return;
    }

    const filtered = (currentBreeds || []).filter(item => {
      const zh = String(item.chinese_name || '').toLowerCase();
      const en = String(item.english_name || '').toLowerCase();
      return zh.indexOf(query) !== -1 || en.indexOf(query) !== -1;
    });

    this.setData({ 
      breedSearchQuery: rawValue,
      filteredBreeds: filtered
    });
  },

  selectBreed(e) {
    const idx = e.currentTarget.dataset.idx;
    const selected = this.data.filteredBreeds[idx];
    if (!selected) return;
    
    const lang = getLanguage();
    const breedName = lang === 'en' 
      ? (selected.english_name || selected.chinese_name)
      : (selected.chinese_name || selected.english_name);
    
    this.setData({ 
      breed: breedName,
      showBreedModal: false
    });
  },

  stopBubble() {},

  openBirthdayModal() {
    this.setData({ showBirthdayModal: true });
  },

  closeBirthdayModal() {
    this.setData({ showBirthdayModal: false });
  },

  onDateChange(e) {
    this.setData({ dateValues: e.detail.value });
  },

  confirmBirthday() {
    const { years, months, days, dateValues } = this.data;
    const y = years[dateValues[0]];
    const m = months[dateValues[1]];
    const d = days[dateValues[2]];
    const dateString = `${y}-${m < 10 ? '0' + m : m}-${d < 10 ? '0' + d : d}`;
    this.setData({ 
      birthday: dateString,
      showBirthdayModal: false
    });
  },

  useCustomBreed() {
    this.setData({ 
      breed: this.data.breedSearchQuery || '',
      showBreedModal: false
    });
  },

  onBirthdayChange(e) { this.setData({ birthday: e.detail.value }); },
  onWeightInput(e) { this.setData({ initialWeight: e.detail.value }); },
  onAvatarUrlInput(e) { this.setData({ avatar: e.detail.value }); },

  removeAvatar() { this.setData({ avatar: null }); },

  chooseAvatar() {
    const that = this;
    const takePhotoText = this.data.i18n.take_photo || '拍照';
    const chooseAlbumText = this.data.i18n.choose_from_album || '从相册选择';
    wx.showActionSheet({
      itemList: [takePhotoText, chooseAlbumText],
      success(res) {
        const sourceType = res.tapIndex === 0 ? ['camera'] : ['album'];
        wx.chooseMedia({
          count: 1,
          mediaType: ['image'],
          sizeType: ['compressed'],
          sourceType: sourceType,
          success(mediaRes) {
            const tempPath = mediaRes.tempFiles[0].tempFilePath;
            wx.getImageInfo({
              src: tempPath,
              success() {
                that.setData({ avatar: tempPath });
              },
              fail() {
                that.setData({ avatar: tempPath });
              }
            });
          }
        });
      }
    });
  },

  handleSave() {
    const { name, species, breed, birthday, initialWeight, avatar, editingPetId } = this.data;
    if (!name.trim()) return;

    let state = app.getState();

    if (editingPetId) {
      state = storage.editPet(state, editingPetId, { name, species, breed, birthday, avatar });
    } else {
      state = storage.addPet(state, { name, species, breed, birthday, initialWeight: parseFloat(initialWeight), avatar });
    }

    app.setState(state);
    this.resetForm();
    this.refreshData();
  },

  handleEditClick(e) {
    const id = e.currentTarget.dataset.id;
    const state = app.getState();
    const pet = state.pets.find(p => p.id === id);
    if (!pet) return;

    this.setData({
      isAdding: true,
      editingPetId: id,
      name: pet.name,
      species: pet.species || 'cat',
      breed: pet.breed || '',
      birthday: pet.birthday || '',
      initialWeight: String(pet.initialWeight || 4.0),
      avatar: pet.avatar || null
    });
  },

  handleDeletePet(e) {
    const id = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name;
    wx.showModal({
      title: '',
      content: `${t('delete_confirm')} ${name}?`,
      success: (res) => {
        if (res.confirm) {
          let state = app.getState();
          state = storage.deletePet(state, id);
          app.setState(state);
          this.refreshData();
        }
      }
    });
  }
});
