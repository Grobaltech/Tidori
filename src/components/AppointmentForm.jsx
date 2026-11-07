import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function AppointmentForm() {
  const [form,setForm] = useState({ full_name:'', email:'', phone:'', appointment_type:'Appointment with the Pastor', meeting_mode:'in_person', date:'', time:'', notes:'' });
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState('');
  const [error,setError] = useState('');
  const update = event => setForm(current=>({...current,[event.target.name]:event.target.value}));
  const submit = async event => {
    event.preventDefault();
    setBusy(true);setError('');setMessage('');
    try {
      if (!supabase) throw new Error('The appointment service is not available right now.');
      const requestedAt = new Date(`${form.date}T${form.time}`);
      if (!Number.isFinite(requestedAt.getTime()) || requestedAt.getTime() < Date.now() - 60000) throw new Error('Please choose a future appointment date and time.');
      const { data: authData } = await supabase.auth.getUser();
      const { error:insertError } = await supabase.from('appointments').insert({
        user_id: authData?.user?.id || null,
        full_name:form.full_name.trim(), email:form.email.trim()||null, phone:form.phone.trim()||null,
        appointment_type:form.appointment_type, meeting_mode:form.meeting_mode, requested_at:requestedAt.toISOString(),
        notes:form.notes.trim()||null, status:'requested',
      });
      if (insertError) throw insertError;
      setMessage('Your appointment request has been received. Tidori Ministries will contact you to confirm it.');
      setForm({ full_name:'', email:'', phone:'', appointment_type:'Appointment with the Pastor', meeting_mode:'in_person', date:'', time:'', notes:'' });
    } catch (err) {
      setError(err.message || 'We could not submit your appointment request. Please try again.');
    } finally { setBusy(false); }
  };
  return <section className="bg-mist p-6 sm:p-9">
    <div className="mb-6"><p className="mb-2 text-gold">Schedule a visit</p><h2 className="text-2xl sm:text-3xl">Request an Appointment</h2><p className="mt-2 text-sm text-gray-600">Send us a preferred date and time. Your appointment is a request until the church team confirms the date and time. Any applicable fee and payment instructions will be confirmed by the church.</p></div>
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-semibold">Full name<input className="field mt-1" name="full_name" value={form.full_name} onChange={update} required maxLength={120} /></label>
      <label className="text-sm font-semibold">Phone number<input className="field mt-1" name="phone" type="tel" value={form.phone} onChange={update} maxLength={40} required /></label>
      <label className="text-sm font-semibold">Email address<input className="field mt-1" name="email" type="email" value={form.email} onChange={update} maxLength={200} /></label>
      <label className="text-sm font-semibold">Appointment type<select className="field mt-1" name="appointment_type" value={form.appointment_type} onChange={update}><option>Appointment with the Pastor</option><option>Pastoral appointment</option><option>Prayer and counselling</option><option>Ministry meeting</option><option>Church office visit</option><option>Other</option></select></label>
      <label className="text-sm font-semibold">Meeting preference<select className="field mt-1" name="meeting_mode" value={form.meeting_mode} onChange={update}><option value="in_person">In-person at the church</option><option value="phone">Phone call (telephone)</option><option value="audio">Audio call (online, microphone only)</option><option value="video">Video call (camera and microphone)</option></select></label>
      <label className="text-sm font-semibold">Preferred date<input className="field mt-1" type="date" name="date" min={new Date().toISOString().slice(0,10)} value={form.date} onChange={update} required /></label>
      <label className="text-sm font-semibold">Preferred time<input className="field mt-1" type="time" name="time" value={form.time} onChange={update} required /></label>
      <label className="text-sm font-semibold sm:col-span-2">Additional details<textarea className="field mt-1 min-h-24" name="notes" value={form.notes} onChange={update} maxLength={2000} placeholder="Tell us briefly what you would like to discuss." /></label>
      {error&&<p role="alert" className="text-sm text-red-600 sm:col-span-2">{error}</p>}
      {message&&<p role="status" className="text-sm text-green-700 sm:col-span-2">{message}</p>}
      <div className="sm:col-span-2"><button className="btn-custom" type="submit" disabled={busy}>{busy?'Sending request…':'Request appointment'}</button></div>
    </form>
  </section>;
}
