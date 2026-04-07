// pages/medical/medical.js
const app = getApp();
const storage = require('../../utils/storage');
const { t, getLanguage } = require('../../utils/i18n');
const dateUtil = require('../../utils/date');

const SYMPTOM_ICONS = {
  fever: { icon: 'Thermometer', color: '#FF7B54' },
  vomiting: { icon: 'Frown', color: '#3498DB' },
  lethargy: { icon: 'Coffee', color: '#9B59B6' },
  no_appetite: { icon: 'Frown', color: '#E74C3C' },
  diarrhea: { icon: 'Droplet', color: '#AAB7B8' },
  coughing: { icon: 'Wind', color: '#1ABC9C' },
  sneezing: { icon: 'deworming', color: '#F1948A' }
};

Page({
  data: {
    symptoms: [],
    selectedSymptoms: [],
    image: null,
    medicalRecords: [],
    i18n: {}
  },

  onLoad() {
    this.setData({
      i18n: {
        medical_log: t('medical_log'), symptoms: t('symptoms'),
        photo: t('photo'), add_record: t('add_record'),
        no_records_yet: t('no_records_yet'),
        take_photo: t('take_photo'), choose_from_album: t('choose_from_album')
      }
    });
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 });
      this.getTabBar().updateLang();
    }
    wx.setNavigationBarTitle({ title: t('medical_log') || 'Medical Log' });
    setTimeout(() => this.refreshData(), 0);
  },

  refreshData() {
    const state = app.getState();
    const isZH = getLanguage() === 'zh';
    const petRecords = state.medicalRecords.filter(m => m.petId === state.activePetId).map(record => ({
      ...record,
      dateFormatted: dateUtil.formatDate(dateUtil.parseISO(record.date), 'MMM dd, yyyy h:mm a', { 
        isZH, 
        monthsShort: t('months') 
      }),
      tagDetails: record.tags.map(tagId => {
        const si = SYMPTOM_ICONS[tagId];
        return { id: tagId, label: t(tagId), icon: si ? si.icon : 'Star', color: si ? si.color : '#8F8377' };
      })
    }));

    const symptoms = ['fever', 'vomiting', 'lethargy', 'no_appetite', 'diarrhea', 'coughing', 'sneezing'].map(id => {
      const si = SYMPTOM_ICONS[id] || {};
      return { id, label: t(id), icon: si.icon || 'Star', color: si.color || '#8F8377' };
    });

    this.setData({ symptoms, medicalRecords: petRecords });
  },

  toggleSymptom(e) {
    const id = e.currentTarget.dataset.id;
    let sel = this.data.selectedSymptoms;
    if (sel.includes(id)) {
      sel = sel.filter(s => s !== id);
    } else {
      sel = [...sel, id];
    }
    this.setData({ selectedSymptoms: sel });
  },

  chooseImage() {
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
            that.setData({ image: mediaRes.tempFiles[0].tempFilePath });
          }
        });
      }
    });
  },

  removeImage() { this.setData({ image: null }); },

  handleSave() {
    const { selectedSymptoms, image } = this.data;
    if (selectedSymptoms.length === 0 && !image) return;

    let state = app.getState();
    state = storage.addMedicalRecord(state, selectedSymptoms, image);
    app.setState(state);

    this.setData({ selectedSymptoms: [], image: null });
    this.refreshData();
    wx.showToast({ title: t('add_record'), icon: 'success' });
  },

  deleteRecord(e) {
    const id = e.currentTarget.dataset.id;
    let state = app.getState();
    state = storage.deleteMedicalRecord(state, id);
    app.setState(state);
    this.refreshData();
  }
});
