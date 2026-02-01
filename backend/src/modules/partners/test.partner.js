import Partner from './partner.model.js';

(async () => {
  try {
    const partner = await Partner.create({
      name: 'Pizza Palace',
      type: 'restaurant',
      contact_name: 'Ramesh',
      contact_phone: '+919999999999',
      notes: 'Manual WhatsApp orders',
    });

    console.log('Partner created:', partner.toJSON());
  } catch (err) {
    console.error(err);
  }
})();
