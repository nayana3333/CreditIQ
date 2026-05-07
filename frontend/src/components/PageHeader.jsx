export default function PageHeader({ title, description }) {
  return (
    <section className="relative rounded-2xl bg-blue-900 p-8 text-white overflow-hidden">
      <div className="absolute top-0 right-0 -m-24 w-96 h-96 bg-white/10 rounded-3xl blur-3xl"></div>
      <div className="relative z-10">
        <h1 className="text-3xl font-bold mb-2">{title}</h1>
        <p className="text-white/80 text-lg">{description}</p>
      </div>
    </section>
  );
}
