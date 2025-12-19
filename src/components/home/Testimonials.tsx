import { Star } from "lucide-react";

const testimonials = [
  {
    quote: "Finally, a tool that gives me the same analytics I had at Goldman but without the $50k terminal fee.",
    author: "Michael Chen",
    role: "Portfolio Manager",
    company: "Meridian Capital",
    rating: 5,
  },
  {
    quote: "The factor analysis helped me identify hidden risks in my portfolio I never knew existed. Essential for any serious investor.",
    author: "Sarah Williams",
    role: "Independent Investor",
    company: "FIRE Community",
    rating: 5,
  },
  {
    quote: "Monte Carlo simulations in seconds, not hours. This is what portfolio analysis should look like in 2024.",
    author: "James Rodriguez",
    role: "Quantitative Analyst",
    company: "Apex Strategies",
    rating: 5,
  },
];

const Testimonials = () => {
  return (
    <section className="py-20 lg:py-28 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Trusted by <span className="gradient-text">Serious Investors</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Join thousands of investors who've upgraded their analysis workflow.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="glass rounded-2xl p-6 lg:p-8 flex flex-col animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-warning text-warning" />
                ))}
              </div>

              {/* Quote */}
              <blockquote className="text-foreground leading-relaxed mb-6 flex-1">
                "{testimonial.quote}"
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">
                    {testimonial.author.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-sm">{testimonial.author}</p>
                  <p className="text-xs text-muted-foreground">
                    {testimonial.role} · {testimonial.company}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
