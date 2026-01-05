---
layout: layout.njk
title: Software & Data
---

{% for item in software %}

    {{ item.name }}
    {{ item.description }}
    Type: {{ item.type }}
    {% if item.github %}
    GitHub Repository
    {% endif %}
    {% if item.download %}
    Download
    {% endif %}

{% endfor %}
