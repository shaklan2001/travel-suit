import type { CSSProperties } from "react";
import { inr } from "../../data/holiday-desk";
import { inrShort, type DocDay, type TripDoc } from "../../data/trip-document";

const DAYS_PER_PAGE = 4;

function chunk<T>(items: T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let index = 0; index < items.length; index += size) pages.push(items.slice(index, index + size));
  return pages;
}

/** The designed document, as A4 pages. The same markup is previewed on screen and printed to PDF. */
export function TripDocumentView({ doc }: { doc: TripDoc }) {
  const dayPages = chunk(doc.days, DAYS_PER_PAGE);
  const total = 2 + dayPages.length + (doc.price ? 1 : 0) + 1;
  let pageNo = 2;
  const style = { "--td-accent": doc.brand.accent } as CSSProperties;

  return (
    <div className={`td-doc td-${doc.template}`} style={style}>
      <section className="td-page td-cover">
        <div className="td-cover-photo" style={{ backgroundImage: `url(${doc.hero})` }} />
        <div className="td-cover-shade" />
        <header className="td-cover-brand">
          <span className="td-mark">{doc.brand.agency.slice(0, 1)}</span>
          <strong>{doc.brand.agency}</strong>
        </header>
        <div className="td-cover-text">
          <p className="td-overline">{doc.kind === "quote" ? "Your holiday quote" : "Your holiday plan"}</p>
          <h1>{doc.title}</h1>
          <p className="td-cover-sub">{doc.subtitle}</p>
          <dl className="td-cover-facts">
            <div>
              <dt>Prepared for</dt>
              <dd>{doc.travellers}</dd>
            </div>
            <div>
              <dt>Travel dates</dt>
              <dd>{doc.dates}</dd>
            </div>
            <div>
              <dt>Reference</dt>
              <dd>{doc.ref}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="td-page">
        <PageHead doc={doc} label="Your trip at a glance" />
        <div className="td-body">
          <p className="td-intro">{doc.intro}</p>
          <dl className="td-glance">
            {doc.glance.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
          <div className="td-gallery">
            {doc.gallery.map((src) => (
              <span key={src} style={{ backgroundImage: `url(${src})` }} />
            ))}
          </div>
          {doc.flight || doc.stay ? (
            <div className="td-picks">
              {doc.flight ? (
                <div>
                  <p className="td-label">Flights</p>
                  <strong>
                    {doc.flight.airline} · {doc.flight.flightNo}
                  </strong>
                  <span>
                    Departs {doc.flight.depart}, arrives {doc.flight.arrive} · {doc.flight.duration} ·{" "}
                    {doc.flight.stops === 0 ? "non-stop" : `via ${doc.flight.via}`}
                  </span>
                  <span>Return · {doc.flight.baggage}</span>
                </div>
              ) : null}
              {doc.stay ? (
                <div>
                  <p className="td-label">Your stay</p>
                  <strong>{doc.stay.name}</strong>
                  <span>
                    {doc.stay.area} · {"★".repeat(doc.stay.stars)} · {doc.stay.board}
                  </span>
                  <span>{doc.stay.reason}</span>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        <PageFoot doc={doc} page={pageNo} total={total} />
      </section>

      {dayPages.map((days, index) => {
        pageNo += 1;
        return (
          <section className="td-page" key={`days-${index}`}>
            <PageHead doc={doc} label={index === 0 ? "Day by day" : "Day by day, continued"} />
            <ol className="td-days">
              {days.map((day) => (
                <DayItem key={day.day} day={day} />
              ))}
            </ol>
            <PageFoot doc={doc} page={pageNo} total={total} />
          </section>
        );
      })}

      {doc.price ? (
        <section className="td-page">
          <PageHead doc={doc} label="Your price" />
          <div className="td-body">
            <div className="td-price-box">
              <div>
                <p className="td-label">Package price</p>
                <strong>{inr(doc.price.total)}</strong>
                <span>
                  {inr(doc.price.perPerson)} per person · all taxes included
                </span>
              </div>
              <div className="td-price-valid">
                <p className="td-label">Valid until</p>
                <span>{doc.validity}</span>
              </div>
            </div>
            <div className="td-two">
              <div>
                <h3>Included</h3>
                <ul className="td-ticks">
                  {doc.inclusions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>Not included</h3>
                <ul className="td-crosses">
                  {doc.exclusions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="td-pay">
              <h3>To confirm</h3>
              <ol>
                <li>Reply on WhatsApp or call us to hold the price.</li>
                <li>Pay 25% to book. The balance is due 21 days before you fly.</li>
                <li>We send your tickets, vouchers, and a day-by-day app link.</li>
              </ol>
            </div>
          </div>
          <PageFoot doc={doc} page={(pageNo += 1)} total={total} />
        </section>
      ) : null}

      <section className="td-page td-last">
        <PageHead doc={doc} label="Before you go" />
        <div className="td-body">
          <div className="td-two">
            <div>
              <h3>Pack and prepare</h3>
              <ul className="td-ticks">
                {doc.tips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Good to know</h3>
              <ul className="td-dots">
                {doc.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
                {!doc.price ? <li>Estimated budget: {inrShort(doc.estimate.low)} – {inrShort(doc.estimate.high)} for the group.</li> : null}
              </ul>
            </div>
          </div>
          <div className="td-contact">
            <div>
              <p className="td-label">Your holiday expert</p>
              <strong>{doc.brand.agency}</strong>
              <span>
                {doc.brand.phone} · {doc.brand.email}
              </span>
            </div>
            <span className="td-contact-cta">We're on WhatsApp, every day of the trip.</span>
          </div>
        </div>
        <PageFoot doc={doc} page={(pageNo += 1)} total={total} />
      </section>
    </div>
  );
}

function DayItem({ day }: { day: DocDay }) {
  return (
    <li className={day.photo ? "with-photo" : undefined}>
      <span className="td-day-no">
        <small>Day</small>
        {day.day}
      </span>
      <div>
        <h3>{day.title}</h3>
        {day.text ? <p>{day.text}</p> : null}
        {day.photo ? <span className="td-day-photo" style={{ backgroundImage: `url(${day.photo})` }} /> : null}
      </div>
    </li>
  );
}

function PageHead({ doc, label }: { doc: TripDoc; label: string }) {
  return (
    <header className="td-head">
      <span className="td-head-brand">
        <span className="td-mark small">{doc.brand.agency.slice(0, 1)}</span>
        {doc.brand.agency}
      </span>
      <h2>{label}</h2>
    </header>
  );
}

function PageFoot({ doc, page, total }: { doc: TripDoc; page: number; total: number }) {
  return (
    <footer className="td-foot">
      <span>
        {doc.title} · {doc.ref}
      </span>
      <span>
        {page} / {total}
      </span>
    </footer>
  );
}
