// pages/pawfile/pawfile.js
const app = getApp();
const storage = require('../../utils/storage');
const { t } = require('../../utils/i18n');

Page({
  data: {
    pets: [],
    isAdding: false,
    editingPetId: null,
    name: '',
    species: 'cat',
    breed: '',
    birthday: '',
    initialWeight: '4.0',
    avatar: null,
    speciesList: ['cat', 'dog', 'other'],
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
        who_caring: t('who_caring'), delete_confirm: t('delete_confirm')
      }
    });
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
      this.getTabBar().updateLang();
    }
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
      name: '', species: 'cat', breed: '', birthday: '', initialWeight: '4.0', avatar: null
    });
  },

  setSpecies(e) {
    this.setData({ species: e.currentTarget.dataset.species });
  },

  onNameInput(e) { this.setData({ name: e.detail.value }); },
  onBreedInput(e) { this.setData({ breed: e.detail.value }); },
  onBirthdayChange(e) { this.setData({ birthday: e.detail.value }); },
  onWeightInput(e) { this.setData({ initialWeight: e.detail.value }); },
  onAvatarUrlInput(e) { this.setData({ avatar: e.detail.value }); },

  removeAvatar() { this.setData({ avatar: null }); },

  chooseAvatar() {
    const that = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success(res) {
        const tempPath = res.tempFiles[0].tempFilePath;
        // 压缩图片到 200px
        const ctx = wx.createCanvasContext('avatarCanvas', that);
        wx.getImageInfo({
          src: tempPath,
          success(info) {
            const maxDim = 200;
            let w = info.width, h = info.height;
            if (w > h && w > maxDim) { h *= maxDim / w; w = maxDim; }
            else if (h > maxDim) { w *= maxDim / h; h = maxDim; }
            // 简单使用临时路径
            that.setData({ avatar: tempPath });
          },
          fail() {
            that.setData({ avatar: tempPath });
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
