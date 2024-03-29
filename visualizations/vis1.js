
function legend({
  div,
  color,
  title,
  tick_size = 6,
  width = 320, 
  height = 44 + tick_size,
  marginTop = 18,
  marginRight = 0,
  marginBottom = 16 + tick_size,
  marginLeft = 0,
  ticks = width / 64,
  tickFormat,
  val_ticl
} = {}) {

  const svg = div.append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .style("overflow", "visible")
      .style("display", "block");

  let adj_tick = g => g.selectAll(".tick line").attr("y1", marginTop + marginBottom - height);
  let x;

  // Continuous
  if (color.interpolate) {
    const n = Math.min(color.domain().length, color.range().length);

    x = color.copy().rangeRound(d3.quantize(d3.interpolate(marginLeft, width - marginRight), n));

    svg.append("image")
        .attr("x", marginLeft)
        .attr("y", marginTop)
        .attr("width", width - marginLeft - marginRight)
        .attr("height", height - marginTop - marginBottom)
        .attr("preserveAspectRatio", "none")
        .attr("xlink:href", ramp(color.copy().domain(d3.quantize(d3.interpolate(0, 1), n))).toDataURL());
  }

  // Sequential
  else if (color.interpolator) {
    x = Object.assign(color.copy()
        .interpolator(d3.interpolateRound(marginLeft, width - marginRight)),
        {range() { return [marginLeft, width - marginRight]; }});

    svg.append("image")
        .attr("x", marginLeft)
        .attr("y", marginTop)
        .attr("width", width - marginLeft - marginRight)
        .attr("height", height - marginTop - marginBottom)
        .attr("preserveAspectRatio", "none")
        .attr("xlink:href", ramp(color.interpolator()).toDataURL());

    // scaleSequentialQuantile doesn’t implement ticks or tickFormat.
    if (!x.ticks) {
      if (val_ticl === undefined) {
        const n = Math.round(ticks + 1);
        val_ticl = d3.range(n).map(i => d3.quantile(color.domain(), i / (n - 1)));
      }
      if (typeof tickFormat !== "function") {
        tickFormat = d3.format(tickFormat === undefined ? ",f" : tickFormat);
      }
    }
  }

  // Threshold
  else if (color.invertExtent) {
    const thresholds
        = color.thresholds ? color.thresholds() // scaleQuantize
        : color.quantiles ? color.quantiles() // scaleQuantile
        : color.domain(); // scaleThreshold

    const thresholdFormat
        = tickFormat === undefined ? d => d
        : typeof tickFormat === "string" ? d3.format(tickFormat)
        : tickFormat;

    x = d3.scaleLinear()
        .domain([-1, color.range().length - 1])
        .rangeRound([marginLeft, width - marginRight]);

    svg.append("g")
      .selectAll("rect")
      .data(color.range())
      .join("rect")
        .attr("x", (d, i) => x(i - 1))
        .attr("y", marginTop)
        .attr("width", (d, i) => x(i) - x(i - 1))
        .attr("height", height - marginTop - marginBottom)
        .attr("fill", d => d);

    val_ticl = d3.range(thresholds.length);
    tickFormat = i => thresholdFormat(thresholds[i], i);
  }

  // Ordinal
  else {
    x = d3.scaleBand()
        .domain(color.domain())
        .rangeRound([marginLeft, width - marginRight]);

    svg.append("g")
      .selectAll("rect")
      .data(color.domain())
      .join("rect")
        .attr("x", x)
        .attr("y", marginTop)
        .attr("width", Math.max(0, x.bandwidth() - 1))
        .attr("height", height - marginTop - marginBottom)
        .attr("fill", color);

    adj_tick = () => {};
  }

  svg.append("g")
      .attr("transform", `translate(0,${height - marginBottom})`)
      .call(d3.axisBottom(x)
        .ticks(ticks, typeof tickFormat === "string" ? tickFormat : undefined)
        .tickFormat(typeof tickFormat === "function" ? tickFormat : undefined)
        .tickSize(tick_size)
        .tickValues(val_ticl))
      .call(adj_tick)
      .call(g => g.select(".domain").remove())
      .call(g => g.append("text")
        .attr("x", marginLeft)
        .attr("y", marginTop + marginBottom - height - 6)
        .attr("fill", "currentColor")
        .attr("text-anchor", "start")
        .attr("font-weight", "bold")
        .text(title));
}


function vis1(data, div) {
  var donor_data = Array.from(d3.rollup(data, rec=>d3.sum(rec.map(c=>c.commitment_amount_usd_constant)), d=>d.donor), ([country, amount])=>({country,amount})).sort((a, b) => d3.descending(a.amount, b.amount));
  var recipient_data = Array.from(d3.rollup(data, rec=>-d3.sum(rec.map(c=>c.commitment_amount_usd_constant)), d=>d.recipient), ([country, amount])=>({country,amount})).sort((a, b) => d3.descending(a.amount, b.amount));
  
  var donor_map = Object.fromEntries(donor_data.map(item => [item.country, item.amount]));
  var recipient_map = Object.fromEntries(recipient_data.map(item => [item.country, item.amount]));

  var merged_data = donor_data.concat(recipient_data).sort((a, b) => d3.descending(
    ( a.country in donor_map ? donor_map[a.country]: 0 )+ (a.country in recipient_map ? recipient_map[a.country] : 0), 
    ( b.country in donor_map ? donor_map[b.country]: 0 )+ (b.country in recipient_map ? recipient_map[b.country] : 0)
  ));

  var countries = Array.from(new Set(merged_data.map(d => d.country)));
  
  const margin = ({top: 29, right: 59, bottom: 9, left: 59});
  const width = 999;
  var barHeight = 9;
  const height = Math.ceil((Math.max(donor_data.length, recipient_data.length) + 0.1) * barHeight) + margin.top + margin.bottom;
  console.log(height);
  
  var x = d3.scaleLinear()
    .domain(d3.extent(merged_data, d => d.amount))
    .rangeRound([margin.left, width - margin.right]);
  
  var t= margin.bottom;
  var y = d3.scaleBand()
    .domain(countries)
    .rangeRound([margin.top, height - t])
    .padding(0.1);
  
  var xAxis = g => g
  .attr("transform", `translate(0,${margin.top})`)
  .call(d3.axisTop(x).ticks(width / 80).tickFormat(function(d){return d/1000000 + " M"}))
  .call(g => g.select(".domain").remove());

  var yAxis = g => g
    .attr("transform", `translate(${x(0)},0)`)
    .call(d3.axisLeft(y));

  
  
  var color1 = d3.scaleOrdinal()
    .domain(['Amount Received', 'Amount Donated'])
    .range(d3.schemeSet2);
  
  legend({
      div: div,
      color: color1,
      title: 'Amount in Dollar'
    });

  const svg = div.append('svg')
      .attr("viewBox", [0, 0, width, height])
  
  svg.append("g")
    .selectAll("rect")
    .data(merged_data)
    .join("rect")
      .attr("fill", d => d3.schemeSet2[d.amount > 0 ? 1 : 0])
      .attr("x", d => x(Math.min(d.amount, 0)))
      .attr("y", d=>y(d.country))
      .attr("width", d => Math.abs(x(d.amount) - x(0)))
      .attr("height", y.bandwidth());

  svg.append("g")
      .call(xAxis);

  svg.append("g")
      .call(yAxis);
}
