// pages/medical/medical.js
const app = getApp();
const storage = require('../../utils/storage');
const { t } = require('../../utils/i18n');
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

  onShow() { this.refreshData(); },

  refreshData() {
    const state = app.getState();
    const petRecords = state.medicalRecords.filter(m => m.petId === state.activePetId).map(record => ({
      ...record,
      dateFormatted: dateUtil.formatDate(dateUtil.parseISO(record.date), 'MMM dd, yyyy h:mm a'),
      tagDetails: record.tags.map(tagId => {
        const si = SYMPTOM_ICONS[tagId];
        return { id: tagId, label: t(tagId), icon: si ? si.icon : 'Star', color: si ? si.color : '#8F8377' };
      })
    }));

    const symptoms = ['fever', 'vomiting', 'lethargy', 'no_appetite', 'diarrhea', 'coughing', 'sneezing'].map(id => {
      const si = SYMPTOM_ICONS[id] || {};
      return { id, label: t(id), icon: si.icon || 'Star', color: si.color || '#8F8377' };
    });

    this.setData({
      symptoms,
      medicalRecords: petRecords,
      i18n: {
        medical_log: t('medical_log'), symptoms: t('symptoms'),
        photo: t('photo'), add_record: t('add_record'),
        no_records_yet: t('no_records_yet')
      }
    });
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
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success(res) {
        that.setData({ image: res.tempFiles[0].tempFilePath });
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
